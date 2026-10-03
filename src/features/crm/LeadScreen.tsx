import React, {useEffect, useState} from 'react';
import {Linking, Pressable, RefreshControl, ScrollView, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Building2,
  CalendarClock,
  Check,
  Footprints,
  Handshake,
  Mail,
  MapPin,
  Megaphone,
  MessageCircle,
  MessageSquare,
  Pencil,
  Phone,
  PhoneOff,
  TriangleAlert,
  UserRound,
  type LucideIcon,
} from 'lucide-react-native';
import type {FollowUp, Lead} from '../../api/endpoints/crm';
import {
  BottomSheet,
  Button,
  Card,
  EmptyState,
  IconButton,
  Skeleton,
  Text,
  TextField,
  toast,
} from '../../components/ui';
import {formatDay, parseServerDate, toDateKey} from '../../lib/date';
import {haptics} from '../../lib/haptics';
import type {AppScreenProps} from '../../navigation/types';
import {useTheme} from '../../theme/ThemeProvider';
import {ChoiceChips, DateButton, IconWell} from '../setup/parts';
import {
  FOLLOW_UP_TYPES,
  isFollowUpDue,
  leadPhone,
  nextDate,
  phoneWasLost,
  STAGES,
  stageOf,
  type Stage,
} from './crmLogic';
import {useFollowUps, useLeads, useLogFollowUp, useSetStage} from './queries';

const dayText = (key?: string | null) => {
  const d = parseServerDate(key);
  if (!d) {
    return '';
  }
  return `${formatDay(d)}${d.getFullYear() !== new Date().getFullYear() ? ` ${d.getFullYear()}` : ''}`;
};

export function LeadScreen({navigation, route}: AppScreenProps<'Lead'>) {
  const {id} = route.params;
  const {colors, spacing, radius} = useTheme();
  const insets = useSafeAreaInsets();
  const leads = useLeads();
  const lead = leads.data?.find(l => l.id === id);
  const followUps = useFollowUps(id);
  const setStage = useSetStage();
  const [logging, setLogging] = useState(false);

  if (!lead) {
    return (
      <View style={{flex: 1, backgroundColor: colors.background, paddingTop: insets.top + spacing.sm}}>
        <View style={{paddingHorizontal: spacing.lg}}>
          <IconButton icon={ArrowLeft} accessibilityLabel="Back" onPress={() => navigation.goBack()} />
        </View>
        <View style={{padding: spacing.lg}}>
          {leads.isPending ? (
            <Skeleton height={220} radius={20} />
          ) : (
            <Card>
              <EmptyState
                compact
                icon={Handshake}
                title="Lead not found"
                message="It may belong to someone else."
              />
            </Card>
          )}
        </View>
      </View>
    );
  }

  const stage = stageOf(lead.status);
  const phone = leadPhone(lead);
  const lost = phoneWasLost(lead);
  const email = lead.email?.trim() || null;
  const created = parseServerDate(lead.created_at);
  const open = (url: string) => Linking.openURL(url).catch(() => toast.error('Couldn’t open that.'));

  return (
    <View style={{flex: 1, backgroundColor: colors.background}}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          paddingTop: insets.top + spacing.sm,
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.sm,
        }}>
        <IconButton icon={ArrowLeft} accessibilityLabel="Back" onPress={() => navigation.goBack()} />
        <View style={{flex: 1, minWidth: 0}}>
          <Text variant="h2" numberOfLines={1}>
            {lead.name}
          </Text>
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {lead.company_name?.trim() || 'Lead'}
            {created ? ` · added ${dayText(lead.created_at)}` : ''}
          </Text>
        </View>
        <IconButton
          icon={Pencil}
          accessibilityLabel="Edit lead"
          onPress={() => navigation.navigate('LeadForm', {id})}
        />
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: spacing.lg,
          paddingTop: spacing.sm,
          gap: spacing.md,
          paddingBottom: 120,
        }}
        refreshControl={
          <RefreshControl
            refreshing={leads.isRefetching || followUps.isRefetching}
            onRefresh={() => {
              leads.refetch();
              followUps.refetch();
            }}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }>
        <View style={{flexDirection: 'row', gap: spacing.sm}}>
          <Action
            icon={phone ? Phone : PhoneOff}
            label={phone ? 'Call' : 'No number'}
            onPress={phone ? () => open(`tel:${phone}`) : undefined}
          />
          <Action icon={Mail} label="Email" onPress={email ? () => open(`mailto:${email}`) : undefined} />
          <Action
            icon={MessageCircle}
            label="WhatsApp"
            onPress={phone ? () => open(`https://wa.me/91${phone}`) : undefined}
          />
        </View>
        {lost ? (
          <View
            style={{
              flexDirection: 'row',
              gap: spacing.sm,
              padding: 12,
              borderRadius: radius.md,
              backgroundColor: colors.warningSoft,
            }}>
            <TriangleAlert size={16} color={colors.warning} style={{marginTop: 1}} />
            <Text variant="caption" style={{flex: 1}}>
              The server lost this lead’s phone number (it saved 2147483647). Add it again once the backend
              stores phone numbers as text.
            </Text>
          </View>
        ) : null}

        <ChoiceChips
          label="Stage"
          items={STAGES.map(s => ({value: s, label: s}))}
          value={stage}
          onChange={s => {
            if (s !== stage && !setStage.isPending) {
              haptics.select();
              setStage.mutate({lead, stage: s});
            }
          }}
        />

        <Card style={{paddingVertical: 4}}>
          {[
            {icon: Megaphone, label: 'Source', value: lead.lead_from},
            {icon: UserRound, label: 'Owner', value: lead.employee?.name},
            {icon: Mail, label: 'Email', value: email},
            {icon: Building2, label: 'Company', value: lead.company_name},
            {icon: MapPin, label: 'Address', value: lead.company_address},
            {
              icon: CalendarClock,
              label: 'Next',
              value: nextDate(lead)
                ? `${dayText(nextDate(lead))}${isFollowUpDue(lead) ? ' · overdue' : ''}`
                : 'Not planned',
              danger: isFollowUpDue(lead) && nextDate(lead)! < toDateKey(),
            },
          ]
            .filter(r => r.value && String(r.value).trim())
            .map((r, i) => (
              <Row
                key={r.label}
                icon={r.icon}
                label={r.label}
                value={String(r.value)}
                first={i === 0}
                danger={r.danger}
              />
            ))}
        </Card>

        {lead.notes?.trim() ? (
          <Card>
            <Text variant="overline" tone="muted">
              Notes
            </Text>
            <Text style={{marginTop: spacing.sm}}>{lead.notes.trim()}</Text>
          </Card>
        ) : null}

        <Card>
          <Text variant="overline" tone="muted" style={{marginBottom: spacing.md}}>
            Follow-ups{followUps.data ? ` · ${followUps.data.length}` : ''}
          </Text>
          {followUps.isPending ? (
            <Skeleton height={60} radius={14} />
          ) : !followUps.data?.length ? (
            <Text tone="muted">None yet. Log the first one below.</Text>
          ) : (
            followUps.data.map((f, i) => (
              <FollowUpItem key={f.id} f={f} last={i === followUps.data!.length - 1} />
            ))
          )}
        </Card>
      </ScrollView>

      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          paddingBottom: insets.bottom + spacing.md,
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}>
        <Button title="Log follow-up" icon={MessageSquare} onPress={() => setLogging(true)} />
      </View>

      <LogFollowUpSheet visible={logging} onClose={() => setLogging(false)} lead={lead} />
    </View>
  );
}

function Action({icon: Icon, label, onPress}: {icon: LucideIcon; label: string; onPress?: () => void}) {
  const {colors, radius} = useTheme();
  const on = !!onPress;
  return (
    <Pressable
      onPress={onPress}
      disabled={!on}
      accessibilityRole="button"
      accessibilityState={{disabled: !on}}
      accessibilityLabel={label}
      style={{
        flex: 1,
        alignItems: 'center',
        gap: 6,
        paddingVertical: 12,
        borderRadius: radius.lg,
        backgroundColor: on ? colors.primarySoft : colors.surfaceMuted,
      }}>
      <Icon size={20} color={on ? colors.primary : colors.textSubtle} />
      <Text
        variant="caption"
        color={on ? colors.primary : colors.textSubtle}
        style={{fontFamily: 'PlusJakartaSans-Bold'}}>
        {label}
      </Text>
    </Pressable>
  );
}

function Row({
  icon: Icon,
  label,
  value,
  first,
  danger,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  first: boolean;
  danger?: boolean;
}) {
  const {colors, spacing} = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: spacing.md,
        paddingVertical: 11,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: colors.border,
      }}>
      <Icon size={18} color={colors.textMuted} />
      <Text tone="muted" style={{width: 72}}>
        {label}
      </Text>
      <Text variant="title" style={{flex: 1}} color={danger ? colors.danger : colors.text}>
        {value}
      </Text>
    </View>
  );
}

function FollowUpItem({f, last}: {f: FollowUp; last: boolean}) {
  const {colors, spacing} = useTheme();
  const visit = (f.type ?? '').toLowerCase().includes('visit');
  const when = dayText(f.created_at);
  return (
    <View style={{flexDirection: 'row', gap: spacing.md}}>
      <View style={{alignItems: 'center'}}>
        <IconWell icon={visit ? Footprints : Phone} fg={colors.primary} bg={colors.primarySoft} size={32} />
        {last ? null : (
          <View style={{flex: 1, width: 2, backgroundColor: colors.border, marginVertical: 4}} />
        )}
      </View>
      <View style={{flex: 1, paddingBottom: last ? 0 : spacing.md}}>
        <Text variant="title">
          {visit ? 'Visit' : 'Call'}
          {when ? ` · ${when}` : ''}
        </Text>
        <Text variant="caption" tone="muted">
          Stage: {f.status || '—'}
          {f.employee?.name ? ` · by ${f.employee.name}` : ''}
          {nextDate(f) ? ` · next ${dayText(nextDate(f))}` : ''}
        </Text>
        {f.remarks?.trim() ? <Text style={{marginTop: 4}}>{f.remarks.trim()}</Text> : null}
      </View>
    </View>
  );
}

function LogFollowUpSheet({visible, onClose, lead}: {visible: boolean; onClose: () => void; lead: Lead}) {
  const {spacing} = useTheme();
  const log = useLogFollowUp();
  const [type, setType] = useState<string>('By Call');
  const [stage, setStage] = useState<Stage>(stageOf(lead.status));
  const [remarks, setRemarks] = useState('');
  const [next, setNext] = useState('');
  const [tried, setTried] = useState(false);

  useEffect(() => {
    if (visible) {
      setType('By Call');
      setStage(stageOf(lead.status));
      setRemarks('');
      setNext('');
      setTried(false);
    }
  }, [visible, lead.status]);

  const remarksError = remarks.trim().length < 2 ? 'Say briefly what happened.' : null;

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Log follow-up">
      <View style={{gap: spacing.lg}}>
        <ChoiceChips
          label="How"
          items={FOLLOW_UP_TYPES.map(t => ({value: t.value as string, label: t.label}))}
          value={type}
          onChange={setType}
        />
        <ChoiceChips
          label="Where it stands now"
          items={STAGES.map(s => ({value: s, label: s}))}
          value={stage}
          onChange={setStage}
        />
        <TextField
          label="What happened"
          placeholder="e.g. Wants a demo next week"
          value={remarks}
          onChangeText={setRemarks}
          multiline
          maxLength={500}
          error={tried ? remarksError : null}
        />
        <View style={{flexDirection: 'row'}}>
          <DateButton
            label="Next follow-up"
            value={next}
            onChange={setNext}
            min={toDateKey()}
            placeholder="None planned"
          />
        </View>
        <Button
          title="Save follow-up"
          icon={Check}
          loading={log.isPending}
          onPress={() => {
            setTried(true);
            if (!remarksError && !log.isPending) {
              log.mutate({lead, type, stage, remarks, nextDate: next}, {onSuccess: onClose});
            }
          }}
        />
      </View>
    </BottomSheet>
  );
}
