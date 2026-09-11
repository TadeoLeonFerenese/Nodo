/**
 * Safe UUID / unique ID generator that works in Node, Vite, Web, Tauri, and Android WebViews.
 */
export function generateId(prefix = ''): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 10);
  return prefix ? `${prefix}_${timestamp}_${randomPart}` : `${timestamp}-${randomPart}`;
}
