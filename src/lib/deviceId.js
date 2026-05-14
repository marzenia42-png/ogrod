const DEVICE_ID_KEY = 'garden-device-id';

export function getDeviceId() {
  if (typeof window === 'undefined') return 'device-ssr';
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = `device-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    return 'device-fallback';
  }
}
