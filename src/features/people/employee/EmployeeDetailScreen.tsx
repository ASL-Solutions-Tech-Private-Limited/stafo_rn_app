import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Linking, RefreshControl, ScrollView, StatusBar, View} from 'react-native';
import {useQueryClient} from '@tanstack/react-query';
import {MapPinned, UserCheck, UserX} from 'lucide-react-native';
import type {LocalImage} from '../../../api/endpoints/employee';
import {employeePhotoUrl} from '../../../api/endpoints/people';
import {ConfirmDialog, Reveal, toast} from '../../../components/ui';
import {formatClock, toDateKey} from '../../../lib/date';
import type {AppScreenProps} from '../../../navigation/types';
import {useTheme} from '../../../theme/ThemeProvider';
import {buildMonth, leaveBalances, summarizeMonth} from '../employeeInsights';
import {usePeopleOnDate} from '../queries';
import {EMPLOYEE_TABS, EmployeeHeader, type EmployeeTab, type HeaderAction} from './EmployeeHeader';
import {
  useAssignShift,
  useCompanyLeaves,
  useEmployeeDocuments,
  useEmployeeLeaves,
  useEmployeeProfile,
  useMissedPunchRequests,
  useMonthAttendance,
  usePayslips,
  useRequestLiveLocation,
  useSetAttendanceMode,
  useSetEmployeeActive,
  useShifts,
  useUploadReferenceSelfie,
} from './queries';
import {captureFace} from '../../face/captureFace';
import {cropAroundFace} from '../../face/faceImage';
import {
  pickGalleryPhoto,
  SelfiePreviewSheet,
  SelfieRejectSheet,
  SelfieSourceSheet,
  type SelfieSource,
} from './selfieSheets';
import {AttendanceModeSheet, MoreSheet, ShiftSheet, toModeValue, type MoreAction} from './sheets';
import {AttendanceTab} from './tabs/AttendanceTab';
import {DocumentsTab} from './tabs/DocumentsTab';
import {LeaveTab} from './tabs/LeaveTab';
import {OverviewTab} from './tabs/OverviewTab';
import {SalaryTab} from './tabs/SalaryTab';
import {useGraceRule} from '../../setup/useGrace';

const MODE_LABEL = {geo: 'Geo', selfie: 'Selfie', 'qr code': 'QR'} as const;

function currentMonth() {
  return toDateKey().slice(0, 7);
}

type Confirm = 'location' | 'active' | null;
type Sheet = 'mode' | 'shift' | 'more' | 'selfie' | 'selfie-preview' | 'selfie-reject' | null;

export function EmployeeDetailScreen({navigation, route}: AppScreenProps<'EmployeeDetail'>) {
  const {id} = route.params;
  const {colors, spacing, dark} = useTheme();
  const queryClient = useQueryClient();
  const linkedTab = EMPLOYEE_TABS.find(t => t.toLowerCase() === route.params.tab?.toLowerCase());
  const [tab, setTab] = useState<EmployeeTab>(linkedTab ?? 'Overview');
  // A new link to an already-open screen only updates params; follow its tab.
  useEffect(() => {
    if (linkedTab) {
      setTab(linkedTab);
    }
  }, [linkedTab]);
  // Opened from "Add reference selfie" after adding someone: go straight to the selfie sheet.
  const openSelfie = route.params.open === 'selfie';
  useEffect(() => {
    if (openSelfie) {
      const t = setTimeout(() => setSheet('selfie'), 450);
      return () => clearTimeout(t);
    }
  }, [openSelfie]);
  const [month, setMonth] = useState(currentMonth());
  const [sheet, setSheet] = useState<Sheet>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [pickedSelfie, setPickedSelfie] = useState<LocalImage | null>(null);
  const [rejectedSelfie, setRejectedSelfie] = useState<{uri: string; reason: 'none' | 'many'} | null>(null);
  const lastSource = useRef<SelfieSource>('camera');

  // iOS can't present a modal (sheet, dialog, camera) while another is still
  // closing. To chain steps, close the current sheet and run the next step from
  // its onClosed callback.
  const afterClose = useRef<(() => void) | null>(null);
  const closeThen = (next: () => void) => {
    afterClose.current = next;
    setSheet(null);
  };
  const runAfterClose = () => {
    const next = afterClose.current;
    afterClose.current = null;
    next?.();
  };

  // Today's list gives status, branch/department names, shift days and selfie status.
  const today = usePeopleOnDate(toDateKey());
  const person = today.people.find(p => p.employee.id === id);
  const entry = person?.employee;

  const profileQuery = useEmployeeProfile(id);
  const profile = profileQuery.data?.data;
  const monthQuery = useMonthAttendance(id, month);
  const thisMonthQuery = useMonthAttendance(id, currentMonth());
  const leavesQuery = useEmployeeLeaves(id);
  const companyLeaves = useCompanyLeaves();
  const missed = useMissedPunchRequests(id);
  const documents = useEmployeeDocuments(id, tab === 'Documents');
  const payslips = usePayslips(id, tab === 'Salary');
  const shifts = useShifts();

  const setMode = useSetAttendanceMode(id);
  const assign = useAssignShift(id);
  const requestLocation = useRequestLiveLocation(id);
  const setActive = useSetEmployeeActive(id);
  const uploadSelfie = useUploadReferenceSelfie(id);

  const name = profile?.name ?? entry?.name ?? route.params.name ?? 'Employee';
  const firstName = name.split(' ')[0];
  const shift = entry?.shifts?.[0];
  const leaves = useMemo(() => leavesQuery.data ?? [], [leavesQuery.data]);

  const grace = useGraceRule();
  const monthDays = useMemo(
    () => buildMonth(month, monthQuery.data ?? [], leaves, shift, undefined, grace),
    [month, monthQuery.data, leaves, shift, grace],
  );
  const thisMonthSummary = useMemo(
    () =>
      thisMonthQuery.data
        ? summarizeMonth(buildMonth(currentMonth(), thisMonthQuery.data, leaves, shift, undefined, grace))
        : undefined,
    [thisMonthQuery.data, leaves, shift, grace],
  );
  const balances = useMemo(() => leaveBalances(leaves), [leaves]);
  const pendingLeave = leaves.find(l => l.status === 'pending');

  const mode = toModeValue(profile?.attendance_type ?? entry?.attendance_type);
  const hasSelfie = !!(entry?.hasSelfie || profile?.selfie_image);
  const selfieUri =
    entry?.selfie_image && entry.selfie_image_path
      ? `${entry.selfie_image_path.replace(/\/$/, '')}/${entry.selfie_image}`
      : null;

  const showPreview = (image: LocalImage) => {
    setPickedSelfie(image);
    setSheet('selfie-preview');
  };
  const launchPicker = async (source: SelfieSource) => {
    lastSource.current = source;
    if (source === 'camera') {
      const outcome = await captureFace(navigation.navigate, {title: 'Reference selfie', personName: name});
      if (outcome.type === 'photo') {
        showPreview(outcome.image);
      } else if (outcome.type === 'gallery') {
        launchPicker('gallery');
      }
      return;
    }
    const path = await pickGalleryPhoto();
    if (!path) {
      return;
    }
    try {
      const result = await cropAroundFace(path);
      if (result.status === 'ok') {
        showPreview(result.image);
      } else {
        setRejectedSelfie({uri: path.startsWith('file://') ? path : `file://${path}`, reason: result.status});
        setSheet('selfie-reject');
      }
    } catch {
      toast.error("Couldn't read that photo. Try another one.");
    }
  };
  const geo = profile?.geo_status ?? entry?.geo_status ?? '0';
  const active = (profile?.status ?? entry?.status ?? '1') === '1';
  const geoLabel = geo === '2' ? 'Tracking on' : geo === '1' ? 'Request sent · waiting' : 'Not requested';
  const shiftLabel = shift ? shift.shift_name ?? formatClock(shift.start_time) : 'None';
  const subtitle = [
    profile?.position ?? entry?.position,
    profile?.emp_id ?? entry?.emp_id,
    entry?.branch_name,
  ]
    .filter(Boolean)
    .join(' · ');

  const refreshing = profileQuery.isRefetching || leavesQuery.isRefetching || monthQuery.isRefetching;
  const onRefresh = () => {
    queryClient.invalidateQueries({queryKey: ['employee', id]});
    queryClient.invalidateQueries({queryKey: ['missed-punch']});
    queryClient.invalidateQueries({queryKey: ['people']});
  };

  const phone = (profile?.phone ?? entry?.phone ?? '').replace(/\D/g, '').slice(-10);

  const onHeaderAction = (action: HeaderAction | MoreAction) => {
    switch (action) {
      case 'call':
        if (phone) {
          Linking.openURL(`tel:${phone}`).catch(() => toast.error("Couldn't start a call on this device."));
        }
        break;
      case 'whatsapp':
        if (phone) {
          Linking.openURL(`https://wa.me/91${phone}`).catch(() => toast.error("Couldn't open WhatsApp."));
        }
        break;
      case 'mode':
        setSheet('mode');
        break;
      case 'shift':
        setSheet('shift');
        break;
      case 'location':
        setSheet(null);
        if (geo === '2') {
          navigation.navigate('EmployeeRoute', {id, name});
        } else if (geo === '1') {
          toast.info(`Waiting for ${firstName} to accept the location request.`);
        } else {
          setConfirm('location');
        }
        break;
      case 'edit':
        setSheet(null);
        navigation.navigate('EditEmployee', {id, name});
        break;
      case 'selfie':
        setSheet('selfie');
        break;
      case 'active':
        setSheet(null);
        setConfirm('active');
        break;
    }
  };

  return (
    <View style={{flex: 1, backgroundColor: colors.background}}>
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />
      <EmployeeHeader
        name={name}
        subtitle={subtitle}
        photo={profileQuery.data?.image_url ?? (entry ? employeePhotoUrl(entry) : null)}
        status={person?.status}
        inactive={!active}
        modeLabel={MODE_LABEL[mode]}
        shiftLabel={shiftLabel}
        tab={tab}
        onTab={setTab}
        onAction={onHeaderAction}
        onBack={() => navigation.goBack()}
        onMore={() => setSheet('more')}
      />

      <ScrollView
        contentContainerStyle={{padding: spacing.lg, paddingBottom: spacing.huge}}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }>
        <Reveal key={tab}>
          {tab === 'Overview' ? (
            <OverviewTab
              profile={profile}
              entry={entry}
              summary={thisMonthSummary}
              monthLoading={thisMonthQuery.isPending}
              balances={balances}
              pendingLeave={pendingLeave}
              onReviewLeave={() => setTab('Leave')}
            />
          ) : tab === 'Attendance' ? (
            <AttendanceTab
              month={month}
              onMonth={setMonth}
              canGoNext={month < currentMonth()}
              days={monthDays}
              loading={monthQuery.isPending}
              requests={missed.data ?? []}
              employeeId={id}
              name={name}
              shift={shift}
              requestsLoading={missed.isPending}
            />
          ) : tab === 'Leave' ? (
            <LeaveTab
              employeeId={id}
              firstName={firstName}
              leaves={leaves}
              loading={leavesQuery.isPending}
              balances={balances}
              companyLeaves={companyLeaves.data ?? []}
            />
          ) : tab === 'Documents' ? (
            <DocumentsTab profile={profile} documents={documents.data ?? []} loading={documents.isPending} />
          ) : (
            <SalaryTab
              profile={profile}
              payslips={payslips.data ?? []}
              payslipsLoading={payslips.isPending}
            />
          )}
        </Reveal>
      </ScrollView>

      <AttendanceModeSheet
        visible={sheet === 'mode'}
        onClose={() => setSheet(null)}
        firstName={firstName}
        current={mode}
        hasSelfie={hasSelfie}
        saving={setMode.isPending}
        onSave={m => setMode.mutate(m, {onSuccess: () => setSheet(null)})}
        onClosed={runAfterClose}
        onAddPhoto={() => closeThen(() => setSheet('selfie'))}
      />
      <ShiftSheet
        visible={sheet === 'shift'}
        onClose={() => setSheet(null)}
        firstName={firstName}
        shifts={shifts.data ?? []}
        loading={shifts.isPending}
        currentId={shift?.id}
        saving={assign.isPending}
        onSave={shiftId => assign.mutate(shiftId, {onSuccess: () => setSheet(null)})}
      />
      <MoreSheet
        visible={sheet === 'more'}
        onClose={() => setSheet(null)}
        name={name}
        modeLabel={MODE_LABEL[mode]}
        shiftLabel={shiftLabel}
        hasSelfie={hasSelfie}
        geoLabel={geoLabel}
        active={active}
        onAction={action => closeThen(() => onHeaderAction(action))}
        onClosed={runAfterClose}
      />
      <SelfieSourceSheet
        visible={sheet === 'selfie'}
        onClose={() => setSheet(null)}
        onClosed={runAfterClose}
        firstName={firstName}
        currentUri={selfieUri}
        onPick={source => closeThen(() => launchPicker(source))}
      />
      <SelfiePreviewSheet
        visible={sheet === 'selfie-preview'}
        onClose={() => setSheet(null)}
        onClosed={runAfterClose}
        uri={pickedSelfie?.uri}
        saving={uploadSelfie.isPending}
        onRetake={() => closeThen(() => launchPicker(lastSource.current))}
        onSave={() =>
          pickedSelfie &&
          uploadSelfie.mutate(pickedSelfie, {
            onSuccess: () => {
              setSheet(null);
              setPickedSelfie(null);
            },
          })
        }
      />
      <SelfieRejectSheet
        visible={sheet === 'selfie-reject'}
        onClose={() => setSheet(null)}
        onClosed={runAfterClose}
        firstName={firstName}
        uri={rejectedSelfie?.uri}
        reason={rejectedSelfie?.reason ?? 'none'}
        onCamera={() => closeThen(() => launchPicker('camera'))}
        onGallery={() => closeThen(() => launchPicker('gallery'))}
      />

      <ConfirmDialog
        visible={confirm === 'location'}
        icon={MapPinned}
        title={`Request ${firstName}'s live location?`}
        message={`${firstName} gets a request in the app. Tracking only starts if they accept, and only while it's on.`}
        confirmLabel="Send request"
        loading={requestLocation.isPending}
        onCancel={() => setConfirm(null)}
        onConfirm={() => requestLocation.mutate(undefined, {onSettled: () => setConfirm(null)})}
      />
      <ConfirmDialog
        visible={confirm === 'active'}
        icon={active ? UserX : UserCheck}
        destructive={active}
        title={active ? `Deactivate ${firstName}?` : `Reactivate ${firstName}?`}
        message={
          active
            ? `${firstName} won't be able to sign in or punch attendance. Their history is kept and you can reactivate them any time.`
            : `${firstName} will be able to sign in and punch attendance again.`
        }
        confirmLabel={active ? 'Deactivate' : 'Reactivate'}
        loading={setActive.isPending}
        onCancel={() => setConfirm(null)}
        onConfirm={() => setActive.mutate(!active, {onSettled: () => setConfirm(null)})}
      />
    </View>
  );
}
