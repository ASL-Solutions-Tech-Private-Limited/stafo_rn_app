import DeviceInfo from 'react-native-device-info';

export type DeviceIdentity = {
  /**
   * On Android this is Settings.Secure.ANDROID_ID, the same value the native
   * app registered, so existing employees are not asked to re-register.
   */
  deviceId: string;
  deviceName: string;
  osVersion: string;
};

let cached: DeviceIdentity | null = null;

export async function getDeviceIdentity(): Promise<DeviceIdentity> {
  if (cached) {
    return cached;
  }
  const [deviceId, manufacturer] = await Promise.all([
    DeviceInfo.getUniqueId(),
    DeviceInfo.getManufacturer(),
  ]);
  cached = {
    deviceId,
    deviceName: `${manufacturer} ${DeviceInfo.getModel()}`.trim(),
    osVersion: DeviceInfo.getSystemVersion(),
  };
  return cached;
}
