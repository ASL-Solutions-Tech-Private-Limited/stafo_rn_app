import {useCallback, useState} from 'react';
import {useNavigation} from '@react-navigation/native';
import {useQueryClient} from '@tanstack/react-query';
import {punchWithSelfie} from '../../api/endpoints/punch';
import type {EmployeeInfo} from '../../api/types';
import {haptics} from '../../lib/haptics';
import {getAllowedMode, getTodayAttendance} from '../attendance/attendanceState';
import {captureFace} from '../face/captureFace';
import {queryKeys} from '../home/queries';
import {checkAtBranch, failed, punchedOutcome, punchTitle, usePunchResult} from './punchFlow';

/**
 * Punch in / out the way the company allows: geo opens the map, QR the scanner,
 * selfie the face camera. Selfie and QR first check they're at their branch.
 */
export function usePunchFlow(info: EmployeeInfo | null | undefined) {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const [checking, setChecking] = useState(false);

  const start = useCallback(async () => {
    if (!info || checking) {
      return;
    }
    const show = usePunchResult.getState().show;
    const direction = getTodayAttendance(info.punches).state === 'punched-in' ? 'out' : 'in';
    const mode = getAllowedMode(info);
    if (mode === 'geo') {
      navigation.navigate('GeoPunch', {direction});
      return;
    }

    setChecking(true);
    const problem = await checkAtBranch(info).finally(() => setChecking(false));
    if (problem) {
      haptics.error();
      show(problem);
      return;
    }
    if (mode === 'qr') {
      navigation.navigate('QrPunch', {direction});
      return;
    }

    const photo = await captureFace(navigation.navigate, {
      title: punchTitle(direction),
      personName: info.name,
      subtitle: 'Selfie attendance',
      allowGallery: false,
    });
    if (photo.type !== 'photo') {
      return;
    }
    show({pending: true, title: 'Checking your face…'});
    try {
      await punchWithSelfie(info.id, photo.image);
      haptics.success();
      queryClient.invalidateQueries({queryKey: queryKeys.employeeDashboard});
      show(punchedOutcome(direction, 'selfie', info));
    } catch (e) {
      haptics.error();
      show(
        failed('Couldn’t punch you ' + direction, `${(e as Error).message} Try again with your face well lit.`, {
          retry: true,
        }),
      );
    }
  }, [info, checking, navigation, queryClient]);

  return {start, checking};
}
