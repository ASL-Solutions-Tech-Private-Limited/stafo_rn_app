import React, {useState} from 'react';
import {Linking, ScrollView, View} from 'react-native';
import {
  CalendarOff,
  ChevronRight,
  Download,
  ExternalLink,
  FileText,
  Fingerprint,
  Sheet,
  Users,
  type LucideIcon,
} from 'lucide-react-native';
import type {ReportKind} from '../../api/endpoints/payroll';
import {BottomSheet, Button, Card, PressableScale, Text, toast} from '../../components/ui';
import {formatDay, parseServerDate, toDateKey} from '../../lib/date';
import {haptics} from '../../lib/haptics';
import type {AppScreenProps} from '../../navigation/types';
import {useTheme} from '../../theme/ThemeProvider';
import {DateButton, IconWell, SetupScreen} from '../setup/parts';
import {useBranches, useDepartments} from '../setup/queries';
import {periodRange, type ReportPeriod} from './payrollLogic';
import {useExportReport, useReportExports} from './queries';

const REPORTS: {
  kind: ReportKind;
  title: string;
  description: string;
  icon: LucideIcon;
  tone: 'primary' | 'info' | 'violet';
}[] = [
  {
    kind: 'attendance',
    title: 'Attendance',
    description: 'Who was in, late, absent, by day',
    icon: Fingerprint,
    tone: 'primary',
  },
  {
    kind: 'leave',
    title: 'Leave',
    description: 'Requests, approvals and balances',
    icon: CalendarOff,
    tone: 'info',
  },
  {
    kind: 'employees',
    title: 'Employees',
    description: 'Directory with branch, department, shift',
    icon: Users,
    tone: 'violet',
  },
];

const withYear = (d: Date) =>
  `${formatDay(d)}${d.getFullYear() !== new Date().getFullYear() ? ` ${d.getFullYear()}` : ''}`;

const openLink = (url: string) => Linking.openURL(url).catch(() => toast.error("Couldn't open the file."));

export function ReportsScreen(_: AppScreenProps<'Reports'>) {
  const {colors, spacing} = useTheme();
  const exports = useReportExports();
  const [kind, setKind] = useState<ReportKind | null>(null);
  const tones = {
    primary: [colors.primary, colors.primarySoft],
    info: [colors.info, colors.infoSoft],
    violet: [colors.accents[1].fg, colors.accents[1].bg],
  } as const;

  return (
    <SetupScreen title="Reports" subtitle="Export and share" query={exports}>
      {REPORTS.map(r => (
        <Card key={r.kind} onPress={() => setKind(r.kind)}>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: spacing.md}}>
            <IconWell icon={r.icon} fg={tones[r.tone][0]} bg={tones[r.tone][1]} size={44} />
            <View style={{flex: 1}}>
              <Text variant="title">{r.title}</Text>
              <Text variant="caption" tone="muted">
                {r.description}
              </Text>
            </View>
            <ChevronRight size={18} color={colors.textSubtle} />
          </View>
        </Card>
      ))}

      {exports.data?.length ? (
        <>
          <Text variant="overline" tone="muted" style={{marginTop: spacing.sm}}>
            Recent exports
          </Text>
          <Card style={{padding: 0}}>
            {exports.data.slice(0, 10).map((x, i) => {
              const pdf = x.file_type.toLowerCase() === 'pdf';
              const date = parseServerDate(x.exported_date ?? x.created_at);
              return (
                <PressableScale
                  key={`${x.download_url}-${i}`}
                  onPress={() => openLink(x.download_url)}
                  accessibilityRole="button"
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.md,
                    padding: spacing.lg,
                    borderTopWidth: i ? 1 : 0,
                    borderTopColor: colors.border,
                  }}>
                  <IconWell
                    icon={pdf ? FileText : Sheet}
                    fg={pdf ? colors.danger : colors.success}
                    bg={pdf ? colors.dangerSoft : colors.successSoft}
                    size={36}
                  />
                  <View style={{flex: 1, minWidth: 0}}>
                    <Text variant="title" numberOfLines={1}>
                      {x.file_name.replace(/_/g, ' ').replace(/^\w/, ch => ch.toUpperCase())}
                    </Text>
                    <Text variant="caption" tone="muted">
                      {pdf ? 'PDF' : 'Excel'}
                      {date ? ` · exported ${withYear(date)}` : ''}
                    </Text>
                  </View>
                  <ExternalLink size={16} color={colors.textSubtle} />
                </PressableScale>
              );
            })}
          </Card>
        </>
      ) : null}

      <ExportSheet kind={kind} onClose={() => setKind(null)} onDone={() => exports.refetch()} />
    </SetupScreen>
  );
}

function Chip({label, on, onPress}: {label: string; on: boolean; onPress: () => void}) {
  const {colors} = useTheme();
  return (
    <PressableScale
      onPress={() => {
        haptics.select();
        onPress();
      }}
      accessibilityRole="radio"
      accessibilityState={{checked: on}}
      style={{
        height: 36,
        paddingHorizontal: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: on ? colors.primary : colors.border,
        backgroundColor: on ? colors.primarySoft : colors.surface,
        justifyContent: 'center',
      }}>
      <Text variant="label" color={on ? colors.primary : colors.textMuted}>
        {label}
      </Text>
    </PressableScale>
  );
}

function ChipRow({
  items,
  value,
  onChange,
}: {
  items: {id: number; label: string}[];
  value: number;
  onChange: (id: number) => void;
}) {
  const {spacing} = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{gap: spacing.sm}}
      style={{flexGrow: 0}}>
      {items.map(i => (
        <Chip key={i.id} label={i.label} on={i.id === value} onPress={() => onChange(i.id)} />
      ))}
    </ScrollView>
  );
}

function ExportSheet({
  kind,
  onClose,
  onDone,
}: {
  kind: ReportKind | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const {spacing} = useTheme();
  const branches = useBranches();
  const departments = useDepartments();
  const exporter = useExportReport();
  const [period, setPeriod] = useState<ReportPeriod | 'custom'>('this-month');
  const [from, setFrom] = useState(toDateKey());
  const [to, setTo] = useState(toDateKey());
  const [branchId, setBranchId] = useState(0);
  const [departmentId, setDepartmentId] = useState(0);
  const [format, setFormat] = useState<'pdf' | 'excel'>('pdf');

  const range = period === 'custom' ? {from, to} : periodRange(period);
  const title = REPORTS.find(r => r.kind === kind)?.title ?? '';
  const rangeLabel = () => {
    const a = parseServerDate(range.from);
    const b = parseServerDate(range.to);
    return a && b ? `${withYear(a)} – ${withYear(b)}` : '';
  };

  return (
    <BottomSheet visible={!!kind} onClose={onClose} title={`Export ${title.toLowerCase()}`}>
      <Text variant="label">Period</Text>
      <View style={{flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm}}>
        <Chip label="This month" on={period === 'this-month'} onPress={() => setPeriod('this-month')} />
        <Chip label="Last month" on={period === 'last-month'} onPress={() => setPeriod('last-month')} />
        <Chip label="Custom" on={period === 'custom'} onPress={() => setPeriod('custom')} />
      </View>
      {period === 'custom' ? (
        <View style={{flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md}}>
          <DateButton
            label="From"
            value={from}
            onChange={v => {
              setFrom(v);
              if (to < v) {
                setTo(v);
              }
            }}
          />
          <DateButton label="To" value={to} onChange={setTo} min={from} />
        </View>
      ) : (
        <Text variant="caption" tone="muted" style={{marginTop: 6}}>
          {rangeLabel()}
        </Text>
      )}

      <Text variant="label" style={{marginTop: spacing.lg, marginBottom: spacing.sm}}>
        Branch
      </Text>
      <ChipRow
        value={branchId}
        onChange={setBranchId}
        items={[
          {id: 0, label: 'All branches'},
          ...(branches.data ?? []).map(b => ({id: b.id, label: b.branch_name})),
        ]}
      />
      <Text variant="label" style={{marginTop: spacing.lg, marginBottom: spacing.sm}}>
        Department
      </Text>
      <ChipRow
        value={departmentId}
        onChange={setDepartmentId}
        items={[{id: 0, label: 'All'}, ...(departments.data ?? []).map(d => ({id: d.id, label: d.name}))]}
      />

      <Text variant="label" style={{marginTop: spacing.lg}}>
        Format
      </Text>
      <View style={{flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm}}>
        <Chip label="PDF" on={format === 'pdf'} onPress={() => setFormat('pdf')} />
        <Chip label="Excel" on={format === 'excel'} onPress={() => setFormat('excel')} />
      </View>

      <Button
        title="Export"
        icon={Download}
        style={{marginTop: spacing.xl}}
        loading={exporter.isPending}
        onPress={() =>
          kind &&
          exporter.mutate(
            {kind, from: range.from, to: range.to, format, branchId, departmentId},
            {
              onSuccess: url => {
                onDone();
                onClose();
                toast.success(`${title} report ready`);
                openLink(url);
              },
            },
          )
        }
      />
      <Text variant="caption" tone="subtle" align="center" style={{marginTop: spacing.sm}}>
        Opens in your browser to share or save.
      </Text>
    </BottomSheet>
  );
}
