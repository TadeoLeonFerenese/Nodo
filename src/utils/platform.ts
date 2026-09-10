/**
 * Utility to reliably detect the running platform across Tauri Desktop, Capacitor Mobile, and Web Dev.
 */
export const isTauri = (): boolean => {
  if (typeof window === 'undefined') return false;
  const w = window as unknown as { __TAURI__?: unknown; __TAURI_INTERNALS__?: unknown };
  return Boolean(w.__TAURI__ || w.__TAURI_INTERNALS__);
};

export const isCapacitor = (): boolean => {
  if (typeof window === 'undefined') return false;
  const w = window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } };
  return Boolean(w.Capacitor?.isNativePlatform?.());
};
