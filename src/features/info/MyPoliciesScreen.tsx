import React from 'react';
import {Linking, View} from 'react-native';
import {ExternalLink, FileText} from 'lucide-react-native';
import {Card, EmptyState, Skeleton, Text, toast} from '../../components/ui';
import {formatDay, parseServerDate} from '../../lib/date';
import {useTheme} from '../../theme/ThemeProvider';
import {IconWell, SetupScreen} from '../setup/parts';
import {usePolicies} from '../setup/queries';
import {policyUrl} from '../setup/setupLogic';

/** Company policies for the employee to read. */
export function MyPoliciesScreen() {
  const {colors, spacing} = useTheme();
  const policies = usePolicies();
  const list = policies.data?.policies ?? [];
  const base = policies.data?.filePath;

  return (
    <SetupScreen
      title="Policies"
      subtitle={policies.data ? `${list.length} ${list.length === 1 ? 'policy' : 'policies'}` : null}
      query={policies}>
      {policies.isPending ? (
        <Skeleton height={88} radius={20} />
      ) : !list.length ? (
        <Card>
          <EmptyState
            compact
            icon={FileText}
            title="No policies yet"
            message="Company policies you need to know appear here."
          />
        </Card>
      ) : (
        <View style={{gap: spacing.md}}>
          {list.map(p => {
            const url = policyUrl(p.file, base);
            const date = parseServerDate(p.created_at);
            const year =
              date && date.getFullYear() !== new Date().getFullYear() ? ` ${date.getFullYear()}` : '';
            return (
              <Card
                key={p.id}
                onPress={
                  url
                    ? () => Linking.openURL(url).catch(() => toast.error('Couldn’t open the PDF.'))
                    : undefined
                }
                accessibilityLabel={`${p.title}${url ? ', opens the PDF' : ''}`}>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: spacing.md}}>
                  <IconWell icon={FileText} fg={colors.danger} bg={colors.dangerSoft} size={44} />
                  <View style={{flex: 1, minWidth: 0}}>
                    <Text variant="title">{p.title}</Text>
                    {p.description ? (
                      <Text variant="caption" tone="muted" numberOfLines={2}>
                        {p.description}
                      </Text>
                    ) : null}
                    <Text variant="caption" tone="subtle" style={{marginTop: 2}}>
                      PDF{date ? ` · added ${formatDay(date)}${year}` : ''}
                    </Text>
                  </View>
                  {url ? <ExternalLink size={18} color={colors.primary} /> : null}
                </View>
              </Card>
            );
          })}
          <Text variant="caption" tone="subtle">
            Tap a policy to open it.
          </Text>
        </View>
      )}
    </SetupScreen>
  );
}
