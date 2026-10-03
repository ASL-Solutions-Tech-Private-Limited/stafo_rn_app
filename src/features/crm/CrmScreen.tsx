import React, {useMemo, useState} from 'react';
import {View} from 'react-native';
import {CalendarClock, Handshake, Megaphone, Search} from 'lucide-react-native';
import type {Lead} from '../../api/endpoints/crm';
import {
  Avatar,
  Badge,
  Card,
  EmptyState,
  Skeleton,
  Text,
  TextField,
  type BadgeTone,
} from '../../components/ui';
import {formatDay, parseServerDate, toDateKey} from '../../lib/date';
import type {AppScreenProps} from '../../navigation/types';
import {useSession} from '../../store/session';
import {useTheme} from '../../theme/ThemeProvider';
import {ChoiceChips, SetupScreen} from '../setup/parts';
import {
  crmCounts,
  filterLeads,
  isClosed,
  isFollowUpDue,
  nextDate,
  stageOf,
  type Stage,
  type StageFilter,
} from './crmLogic';
import {useLeads} from './queries';

export const STAGE_TONE: Record<Stage, BadgeTone> = {
  New: 'info',
  Contacted: 'primary',
  Qualified: 'warning',
  Customer: 'success',
  OnBoard: 'success',
  Lost: 'neutral',
};

/** "Follow-up 8 Oct", "Follow-up due today", "Follow-up was due 30 May 2025", "No follow-up planned". */
export function followUpLabel(l: Lead, now = new Date()) {
  const d = nextDate(l);
  if (!d) {
    return 'No follow-up planned';
  }
  const date = parseServerDate(d)!;
  const day = `${formatDay(date)}${date.getFullYear() !== now.getFullYear() ? ` ${date.getFullYear()}` : ''}`;
  if (isClosed(stageOf(l.status))) {
    return `Last planned ${day}`;
  }
  if (isFollowUpDue(l, now)) {
    return d === toDateKey(now) ? 'Follow-up due today' : `Follow-up was due ${day}`;
  }
  return `Follow-up ${day}`;
}

/** The sales pipeline: all leads for the company, their own for an employee. */
export function CrmScreen({navigation}: AppScreenProps<'Crm'>) {
  const {colors, spacing} = useTheme();
  const isCompany = useSession(s => s.role === 'company');
  const leads = useLeads();
  const list = useMemo(() => leads.data ?? [], [leads.data]);
  const counts = crmCounts(list);
  const [filter, setFilter] = useState<StageFilter>('all');
  const [search, setSearch] = useState('');
  const shown = useMemo(() => filterLeads(list, filter, search), [list, filter, search]);
  const byStage = (s: Stage) => list.filter(l => stageOf(l.status) === s).length;

  return (
    <SetupScreen
      title="CRM"
      subtitle={leads.data ? `${list.length} ${list.length === 1 ? 'lead' : 'leads'}` : null}
      onAdd={() => navigation.navigate('LeadForm', {})}
      addLabel="Lead"
      query={leads}>
      {leads.isPending ? (
        <View style={{gap: spacing.md}}>
          <Skeleton height={76} radius={16} />
          <Skeleton height={110} radius={20} />
          <Skeleton height={110} radius={20} />
        </View>
      ) : !list.length ? (
        <Card>
          <EmptyState
            compact
            icon={Handshake}
            title="No leads yet"
            message={isCompany ? 'Add a lead or ask your team to add theirs.' : 'Leads you add appear here.'}
          />
        </Card>
      ) : (
        <View style={{gap: spacing.md}}>
          <View style={{flexDirection: 'row', gap: spacing.sm}}>
            <Tile n={counts.leads} label="Leads" color={colors.primary} />
            <Tile
              n={counts.dueToday + counts.overdue}
              label="Due"
              color={counts.dueToday + counts.overdue ? colors.danger : colors.textMuted}
            />
            <Tile n={counts.won} label="Won" color={colors.success} />
          </View>
          <ChoiceChips
            scroll
            items={[
              {value: 'all' as StageFilter, label: `All · ${list.length}`},
              ...(['New', 'Contacted', 'Qualified'] as Stage[]).map(s => ({
                value: s as StageFilter,
                label: byStage(s) ? `${s} · ${byStage(s)}` : s,
              })),
              {value: 'won' as StageFilter, label: counts.won ? `Won · ${counts.won}` : 'Won'},
              {value: 'Lost' as StageFilter, label: byStage('Lost') ? `Lost · ${byStage('Lost')}` : 'Lost'},
            ]}
            value={filter}
            onChange={setFilter}
          />
          {list.length > 4 ? (
            <TextField
              icon={Search}
              placeholder="Search name, company or email"
              value={search}
              onChangeText={setSearch}
            />
          ) : null}
          {shown.length ? (
            shown.map(l => (
              <LeadCard
                key={l.id}
                lead={l}
                showOwner={isCompany}
                onPress={() => navigation.navigate('Lead', {id: l.id})}
              />
            ))
          ) : (
            <Card>
              <EmptyState
                compact
                icon={Handshake}
                title="No leads here"
                message="Try another stage or search."
              />
            </Card>
          )}
        </View>
      )}
    </SetupScreen>
  );
}

function Tile({n, label, color}: {n: number; label: string; color: string}) {
  return (
    <Card style={{flex: 1, paddingVertical: 12}}>
      <Text variant="h2" color={color}>
        {n}
      </Text>
      <Text variant="caption" tone="muted" numberOfLines={1}>
        {label}
      </Text>
    </Card>
  );
}

function LeadCard({lead, showOwner, onPress}: {lead: Lead; showOwner: boolean; onPress: () => void}) {
  const {colors, spacing} = useTheme();
  const stage = stageOf(lead.status);
  const due = isFollowUpDue(lead);
  return (
    <Card onPress={onPress} accessibilityLabel={`${lead.name}, ${stage}, ${followUpLabel(lead)}`}>
      <View style={{flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md}}>
        <Avatar name={lead.name} size={40} />
        <View style={{flex: 1, minWidth: 0}}>
          <Text variant="title" numberOfLines={1}>
            {lead.name}
          </Text>
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {lead.company_name?.trim() || 'No company'}
          </Text>
          <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: 6}}>
            {lead.lead_from ? (
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
                <Megaphone size={14} color={colors.textMuted} />
                <Text variant="caption" tone="muted">
                  {lead.lead_from}
                </Text>
              </View>
            ) : null}
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
              <CalendarClock size={14} color={due ? colors.danger : colors.textMuted} />
              <Text variant="caption" color={due ? colors.danger : colors.textMuted}>
                {followUpLabel(lead)}
              </Text>
            </View>
          </View>
        </View>
        <Badge label={stage} tone={STAGE_TONE[stage]} dot />
      </View>
      {showOwner && lead.employee?.name ? (
        <Text variant="caption" tone="subtle" style={{marginTop: spacing.sm}}>
          Owner · {lead.employee.name}
        </Text>
      ) : null}
    </Card>
  );
}
