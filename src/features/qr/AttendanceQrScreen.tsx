import React, {useEffect, useMemo, useRef, useState} from 'react';
import {ActivityIndicator, View} from 'react-native';
import {useQuery} from '@tanstack/react-query';
import Svg, {parse} from 'react-native-svg';
import {Download, Printer, QrCode, Share2, ShieldAlert, Users} from 'lucide-react-native';
import {getAttendanceQr} from '../../api/endpoints/setup';
import {Button, Card, EmptyState, Skeleton, Text, toast} from '../../components/ui';
import {haptics} from '../../lib/haptics';
import {toDateKey} from '../../lib/date';
import {useSession} from '../../store/session';
import {useTheme} from '../../theme/ThemeProvider';
import {formatDistance} from '../location/mapParts';
import {usePeopleOnDate} from '../people/queries';
import {useBranches, useDepartments} from '../setup/queries';
import {ChoiceChips, SetupScreen} from '../setup/parts';
import {CARD_H, CARD_W, peopleOnCode, printableSvg} from './qrCard';
import {exportCardPng, saveCard, shareCard} from './qrExport';

/** A fence wider than this lets people punch from far away (same threshold as Branches). */
const WIDE_FENCE_M = 1000;

/** One QR code per branch + department, for people on QR attendance to scan. */
export function AttendanceQrScreen() {
  const {colors, spacing, radius} = useTheme();
  const companyId = useSession(s => s.companyId);
  const branches = useBranches();
  const departments = useDepartments();
  const people = usePeopleOnDate(toDateKey());
  const [branchId, setBranchId] = useState<number | null>(null);
  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [busy, setBusy] = useState<'share' | 'save' | null>(null);
  const exportRef = useRef<Svg>(null);

  useEffect(() => {
    if (branchId == null && branches.data?.length) {
      setBranchId(branches.data[0].id);
    }
  }, [branches.data, branchId]);
  useEffect(() => {
    if (departmentId == null && departments.data?.length) {
      setDepartmentId(departments.data[0].id);
    }
  }, [departments.data, departmentId]);

  const branch = branches.data?.find(b => b.id === branchId);
  const department = departments.data?.find(d => d.id === departmentId);
  const title = branch && department ? `${branch.branch_name} · ${department.name}` : '';

  const qr = useQuery({
    queryKey: ['attendance-qr', companyId, branchId, departmentId],
    queryFn: () => getAttendanceQr(companyId!, branchId!, departmentId!),
    enabled: !!companyId && branchId != null && departmentId != null,
    staleTime: Infinity,
  });
  const qrAst = useMemo(() => (qr.data ? parse(qr.data) : null), [qr.data]);
  const cardAst = useMemo(() => {
    const svg = qr.data && title ? printableSvg(qr.data, title) : null;
    return svg ? parse(svg) : null;
  }, [qr.data, title]);

  const scanners = useMemo(
    () =>
      branch && department
        ? peopleOnCode(
            people.people.map(p => p.employee),
            branch.branch_name,
            department.name,
          )
        : [],
    [people.people, branch, department],
  );
  const radiusM = Number(branch?.radar) || 0;

  const run = async (kind: 'share' | 'save') => {
    if (!exportRef.current || busy) {
      return;
    }
    haptics.tap();
    setBusy(kind);
    try {
      const uri = await exportCardPng(exportRef.current);
      if (kind === 'share') {
        await shareCard(uri, title);
      } else {
        await saveCard(uri);
        haptics.success();
        toast.success('Saved to your photos');
      }
    } catch (e) {
      haptics.error();
      toast.error((e as Error).message || 'Couldn’t create the image.');
    } finally {
      setBusy(null);
    }
  };

  const loadingLists = branches.isPending || departments.isPending;

  return (
    <SetupScreen title="Attendance QR codes" subtitle="For people on QR attendance" query={qr}>
      {loadingLists ? (
        <Skeleton height={420} radius={20} />
      ) : !branches.data?.length || !departments.data?.length ? (
        <Card>
          <EmptyState
            compact
            icon={QrCode}
            title={!branches.data?.length ? 'Add a branch first' : 'Add a department first'}
            message="Each QR code belongs to a branch and a department."
          />
        </Card>
      ) : (
        <View style={{gap: spacing.lg}}>
          <ChoiceChips
            label="Branch"
            items={branches.data.map(b => ({value: b.id, label: b.branch_name}))}
            value={branchId}
            onChange={setBranchId}
          />
          <ChoiceChips
            label="Department"
            items={departments.data.map(d => ({value: d.id, label: d.name}))}
            value={departmentId}
            onChange={setDepartmentId}
          />

          <Card style={{alignItems: 'center', gap: 4}}>
            <Text variant="overline" tone="muted">
              STAFO attendance
            </Text>
            <Text variant="h3" align="center">
              {title}
            </Text>
            <View
              style={{
                marginTop: spacing.md,
                width: 240,
                height: 240,
                padding: 10,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: '#FFFFFF',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              {qrAst ? (
                <Svg {...qrAst.props} width={218} height={218}>
                  {qrAst.children}
                </Svg>
              ) : qr.isError ? (
                <Text tone="danger" align="center">
                  {qr.error.message}
                </Text>
              ) : (
                <ActivityIndicator color={colors.primary} />
              )}
            </View>
            <Text variant="caption" tone="muted" style={{marginTop: spacing.sm}}>
              Scan in the STAFO app to punch in or out
            </Text>
          </Card>

          <Fact icon={Users}>
            {people.query.isPending
              ? 'Checking who uses this code…'
              : scanners.length
              ? `${scanners.length === 1 ? scanners[0].name : `${scanners.length} people`} at ${title} ${
                  scanners.length === 1 ? 'punches' : 'punch'
                } with this code.`
              : `Nobody at ${title} is on QR attendance yet. Switch someone from the ⋯ menu on their profile.`}
          </Fact>

          <View style={{flexDirection: 'row', gap: spacing.sm}}>
            <Button
              title="Share"
              icon={Share2}
              size="md"
              style={{flex: 1}}
              disabled={!cardAst}
              loading={busy === 'share'}
              onPress={() => run('share')}
            />
            <Button
              title="Save image"
              icon={Download}
              variant="ghost"
              size="md"
              style={{flex: 1}}
              disabled={!cardAst}
              loading={busy === 'save'}
              onPress={() => run('save')}
            />
          </View>

          <Fact icon={Printer}>
            This code never changes, so print it once and put it where people arrive. Each department has its
            own code.
          </Fact>
          {radiusM > WIDE_FENCE_M ? (
            <Fact icon={ShieldAlert} color={colors.warning}>
              Scanning also needs them inside the branch geofence, so a photo of the code taken home won’t
              work. {branch?.branch_name}’s fence is {formatDistance(radiusM)}: tighten it in Branches.
            </Fact>
          ) : (
            <Fact icon={ShieldAlert}>
              Scanning also needs them inside the branch geofence, so a photo of the code taken home won’t
              work.
            </Fact>
          )}
        </View>
      )}

      {/* The printable card, drawn off-screen for Share / Save image. */}
      {cardAst ? (
        <View pointerEvents="none" style={{position: 'absolute', left: -CARD_W * 2, top: 0, opacity: 0}}>
          <Svg ref={exportRef} {...cardAst.props} width={CARD_W} height={CARD_H}>
            {cardAst.children}
          </Svg>
        </View>
      ) : null}
    </SetupScreen>
  );
}

function Fact({
  icon: Icon,
  color,
  children,
}: {
  icon: typeof Users;
  color?: string;
  children: React.ReactNode;
}) {
  const {colors} = useTheme();
  const fg = color ?? colors.textMuted;
  return (
    <View style={{flexDirection: 'row', gap: 10}}>
      <Icon size={16} color={fg} style={{marginTop: 2}} />
      <Text style={{flex: 1}} color={fg}>
        {children}
      </Text>
    </View>
  );
}
