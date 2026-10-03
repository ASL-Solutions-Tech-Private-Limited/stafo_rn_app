import React, {useEffect, useState} from 'react';
import {ActivityIndicator, View} from 'react-native';
import {CircleAlert, CircleCheck, ScanFace} from 'lucide-react-native';
import * as StafoLocation from 'stafo-location';
import {BottomSheet, Button, Text} from '../../components/ui';
import {useTheme} from '../../theme/ThemeProvider';
import {punchedTitle, usePunchResult, type PunchOutcome} from './punchFlow';

/**
 * The outcome of a punch, on the employee home. Mounted once; any punch flow
 * shows it through usePunchResult.
 */
export function PunchResultSheet({onRetry}: {onRetry: () => void}) {
  const {colors, spacing} = useTheme();
  const outcome = usePunchResult(s => s.outcome);
  const clear = usePunchResult(s => s.clear);
  // Keep the last outcome on screen while the sheet slides away.
  const [shown, setShown] = useState<PunchOutcome | null>(outcome);
  useEffect(() => {
    if (outcome) {
      setShown(outcome);
    }
  }, [outcome]);
  const [retryAfterClose, setRetryAfterClose] = useState(false);

  const o = shown;
  const pending = !!o && 'pending' in o;
  const ok = !!o && 'ok' in o && o.ok;
  const Icon = pending ? null : ok ? (o.mode === 'selfie' ? ScanFace : CircleCheck) : CircleAlert;
  const fg = ok ? colors.success : pending ? colors.primary : colors.danger;
  const bg = ok ? colors.successSoft : pending ? colors.primarySoft : colors.dangerSoft;

  return (
    <BottomSheet
      visible={!!outcome}
      onClose={() => !pending && clear()}
      onClosed={() => {
        if (retryAfterClose) {
          setRetryAfterClose(false);
          onRetry();
        }
      }}>
      {o ? (
        <View style={{alignItems: 'center', paddingTop: spacing.sm}}>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: bg,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            {Icon ? <Icon size={32} color={fg} /> : <ActivityIndicator color={fg} />}
          </View>
          <Text variant="h2" align="center" style={{marginTop: spacing.md}} accessibilityLiveRegion="polite">
            {'pending' in o ? o.title : o.ok ? (o.mode === 'selfie' ? 'Face matched' : punchedTitle(o)) : o.title}
          </Text>
          {'pending' in o ? (
            <Text tone="muted" align="center" style={{marginTop: 4}}>
              This takes a few seconds.
            </Text>
          ) : (
            <Text tone="muted" align="center" style={{marginTop: 4}}>
              {o.ok ? (o.mode === 'selfie' ? `${punchedTitle(o)} · ${o.detail}` : o.detail) : o.message}
            </Text>
          )}
        </View>
      ) : null}
      {o && !pending ? (
        <View style={{gap: spacing.sm, marginTop: spacing.xl}}>
          {'ok' in o && !o.ok && o.retry ? (
            <Button
              title="Try again"
              onPress={() => {
                setRetryAfterClose(true);
                clear();
              }}
            />
          ) : null}
          {'ok' in o && !o.ok && o.settings ? (
            <Button
              title="Open settings"
              onPress={() => {
                clear();
                StafoLocation.openSettings();
              }}
            />
          ) : null}
          <Button title={ok ? 'Done' : 'Close'} variant={ok ? 'primary' : 'ghost'} onPress={clear} />
        </View>
      ) : null}
    </BottomSheet>
  );
}
