import { getStorageItem, setStorage } from '@/lib/utils/storage';

const DEVICE_ID_KEY = 'deviceId';

export async function getDeviceId() {
  const existing = await getStorageItem(DEVICE_ID_KEY as never, '');
  if (existing) return existing;

  const deviceId = crypto.randomUUID();
  await setStorage({ [DEVICE_ID_KEY]: deviceId });

  return deviceId;
}
