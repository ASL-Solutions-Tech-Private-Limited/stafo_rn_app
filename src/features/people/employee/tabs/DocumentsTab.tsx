import React from 'react';
import {Linking, View} from 'react-native';
import {ChevronRight, FileText, IdCard} from 'lucide-react-native';
import type {EmployeeDocument, EmployeeProfile} from '../../../../api/types';
import {Badge, Card, EmptyState, PressableScale, Skeleton, Text} from '../../../../components/ui';
import {formatDay, parseServerDate} from '../../../../lib/date';
import {useTheme} from '../../../../theme/ThemeProvider';
import {SectionLabel} from '../parts';

/** "123456781234" → "XXXX XXXX 1234"; other IDs keep only their last 4 characters. */
export function maskId(value: string, grouped = false) {
  const clean = value.replace(/\s/g, '');
  const last = clean.slice(-4);
  if (grouped) {
    return `XXXX XXXX ${last}`;
  }
  return `${'•'.repeat(Math.max(0, clean.length - 4))}${last}`;
}

const isVerified = (flag: unknown) => flag === 1 || flag === '1' || flag === true || flag === 'yes';

type Props = {profile?: EmployeeProfile | null; documents: EmployeeDocument[]; loading: boolean};

export function DocumentsTab({profile, documents, loading}: Props) {
  const {colors, spacing, radius} = useTheme();

  const ids = profile
    ? [
        {label: 'Aadhaar', value: profile.aadhar, verified: profile.aadhar_verify, grouped: true},
        {label: 'PAN', value: profile.pan, verified: profile.pan_verify},
        {label: 'Voter ID', value: profile.voter, verified: profile.voter_verify},
        {label: 'Driving licence', value: profile.driving_license, verified: profile.dl_verify},
        {label: 'UAN (PF)', value: profile.uan, verified: profile.uan_verify},
      ].filter(i => i.value)
    : [];

  if (loading && !profile) {
    return <Skeleton height={200} radius={20} />;
  }

  return (
    <View style={{gap: spacing.lg}}>
      <View>
        <SectionLabel>Identity (KYC)</SectionLabel>
        {ids.length ? (
          <Card padded={false}>
            {ids.map((id, i) => (
              <View
                key={id.label}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.md,
                  paddingHorizontal: spacing.lg,
                  paddingVertical: 14,
                  borderTopWidth: i ? 1 : 0,
                  borderTopColor: colors.border,
                }}
                accessibilityLabel={`${id.label}, ending ${String(id.value).slice(-4)}, ${
                  isVerified(id.verified) ? 'verified' : 'not verified'
                }`}>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: radius.md,
                    backgroundColor: colors.primarySoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <IdCard size={18} color={colors.primary} />
                </View>
                <View style={{flex: 1}}>
                  <Text variant="title">{id.label}</Text>
                  <Text variant="caption" tone="muted">
                    {maskId(String(id.value), id.grouped)}
                  </Text>
                </View>
                {isVerified(id.verified) ? (
                  <Badge label="Verified" tone="success" />
                ) : (
                  <Badge label="Not verified" tone="neutral" />
                )}
              </View>
            ))}
          </Card>
        ) : (
          <Card>
            <EmptyState
              compact
              icon={IdCard}
              title="No ID details yet"
              message="Aadhaar, PAN and other IDs appear here once added."
            />
          </Card>
        )}
      </View>

      <View>
        <SectionLabel>Uploaded files</SectionLabel>
        {loading ? (
          <Skeleton height={120} radius={20} />
        ) : documents.length ? (
          <Card padded={false}>
            {documents.map((doc, i) => {
              const name = doc.document_type?.document_name ?? doc.document_name ?? 'Document';
              const added = parseServerDate(doc.created_at?.slice(0, 10));
              return (
                <PressableScale
                  key={doc.id}
                  scaleTo={0.99}
                  disabled={!doc.file_path}
                  onPress={() => doc.file_path && Linking.openURL(doc.file_path)}
                  accessibilityRole="link"
                  accessibilityLabel={`Open ${name}`}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.md,
                    paddingHorizontal: spacing.lg,
                    paddingVertical: 14,
                    borderTopWidth: i ? 1 : 0,
                    borderTopColor: colors.border,
                  }}>
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: radius.md,
                      backgroundColor: colors.surfaceMuted,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <FileText size={18} color={colors.textMuted} />
                  </View>
                  <View style={{flex: 1}}>
                    <Text variant="title">{name}</Text>
                    {added ? (
                      <Text variant="caption" tone="muted">
                        Added {formatDay(added)} {added.getFullYear()}
                      </Text>
                    ) : null}
                  </View>
                  <ChevronRight size={18} color={colors.textSubtle} />
                </PressableScale>
              );
            })}
          </Card>
        ) : (
          <Card>
            <EmptyState
              compact
              icon={FileText}
              title="No files uploaded"
              message="Offer letters, certificates and other files appear here."
            />
          </Card>
        )}
      </View>
    </View>
  );
}
