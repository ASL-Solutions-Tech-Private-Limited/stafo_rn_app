import type {TurboModule} from 'react-native';
import {TurboModuleRegistry} from 'react-native';

export interface Spec extends TurboModule {
  /** 'always' | 'while-in-use' | 'denied' | 'undetermined' */
  getPermissionStatus(): Promise<string>;
  /** iOS only: asks for when-in-use, or upgrades to always. Android asks from JS. */
  requestPermission(always: boolean): Promise<string>;
  isLocationServicesEnabled(): Promise<boolean>;
  /** {latitude, longitude, accuracy, timestamp, mocked} */
  getCurrentPosition(timeoutMs: number, maxAgeMs: number): Promise<Object>;
  /** See TrackingConfig in index.ts. Resolves false when it couldn't start. */
  startTracking(config: Object): Promise<boolean>;
  stopTracking(): Promise<void>;
  /** {running, stopAt, queued, lastSentAt, lastError} */
  getTrackingState(): Promise<Object>;
  openSettings(): void;
}

export default TurboModuleRegistry.getEnforcing<Spec>('StafoLocation');
