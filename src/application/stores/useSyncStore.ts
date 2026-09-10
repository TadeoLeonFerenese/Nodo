import { create } from 'zustand';
import { SyncService } from '../../infrastructure/sync/SyncService';

interface SyncState {
  serverUrl: string;
  isSyncing: boolean;
  isServerOnline: boolean;
  pendingCount: number;
  lastSyncAt: string | null;
  localServerIp: string | null;
  error: string | null;

  setServerUrl: (url: string) => Promise<boolean>;
  refreshPendingCount: () => Promise<void>;
  syncNow: () => Promise<{ success: boolean; pushed: number; error: string | null }>;
  checkServerHealth: () => Promise<boolean>;
  fetchLocalServerIp: () => Promise<void>;
  initSyncEngine: () => void;
}

const STORAGE_KEY = 'nodo_sync_server_url';
const LAST_SYNC_KEY = 'nodo_last_sync_at';

export const useSyncStore = create<SyncState>((set, get) => ({
  serverUrl: typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) || '' : '',
  isSyncing: false,
  isServerOnline: false,
  pendingCount: 0,
  lastSyncAt: typeof window !== 'undefined' ? localStorage.getItem(LAST_SYNC_KEY) : null,
  localServerIp: null,
  error: null,

  setServerUrl: async (url: string) => {
    const trimmed = url.trim().replace(/\/+$/, '');
    set({ isSyncing: true, error: null });
    const isOnline = await SyncService.getInstance().pingServer(trimmed);

    if (isOnline) {
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, trimmed);
      }
      set({ serverUrl: trimmed, isServerOnline: true, isSyncing: false });
      // Trigger immediate push upon pairing
      await get().syncNow();
      return true;
    } else {
      set({
        isSyncing: false,
        error: 'No se pudo contactar al servidor Nodo en esa dirección Wi-Fi.',
      });
      return false;
    }
  },

  refreshPendingCount: async () => {
    const count = await SyncService.getInstance().getPendingCount();
    set({ pendingCount: count });
  },

  checkServerHealth: async () => {
    const { serverUrl } = get();
    if (!serverUrl) {
      set({ isServerOnline: false });
      return false;
    }
    const isOnline = await SyncService.getInstance().pingServer(serverUrl);
    set({ isServerOnline: isOnline });
    return isOnline;
  },

  syncNow: async () => {
    const { serverUrl, isSyncing } = get();
    if (!serverUrl || isSyncing) {
      return { success: false, pushed: 0, error: 'No hay servidor vinculado o ya está sincronizando.' };
    }

    set({ isSyncing: true, error: null });
    const result = await SyncService.getInstance().pushPending(serverUrl);

    if (result.error) {
      set({ isSyncing: false, isServerOnline: false, error: result.error });
      return { success: false, pushed: 0, error: result.error };
    }

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (typeof window !== 'undefined') {
      localStorage.setItem(LAST_SYNC_KEY, now);
    }

    await get().refreshPendingCount();
    set({ isSyncing: false, isServerOnline: true, lastSyncAt: now });
    return { success: true, pushed: result.pushed, error: null };
  },

  fetchLocalServerIp: async () => {
    const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;
    if (!isTauri) return;

    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const ip = await invoke<string>('get_local_ip');
      if (ip) {
        set({ localServerIp: `http://${ip}:4545` });
      }
    } catch {
      // Fallback
      set({ localServerIp: 'http://localhost:4545' });
    }
  },

  initSyncEngine: () => {
    get().refreshPendingCount();

    const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;
    if (isTauri) {
      get().fetchLocalServerIp();
      // Listen for incoming sync batches from Android
      import('@tauri-apps/api/event').then(({ listen }) => {
        listen<string>('sync-batch-received', async (event) => {
          const applied = await SyncService.getInstance().applyIncomingBatch(event.payload);
          if (applied > 0) {
            // Trigger refresh in stores if available
            const { useProductStore } = await import('./useProductStore');
            useProductStore.getState().loadProducts();
            const { useStockStore } = await import('./useStockStore');
            useStockStore.getState().loadMovements();
          }
        });
      });
    } else {
      // On Android / Mobile: check server health and sync periodically every 20 seconds
      get().checkServerHealth();
      setInterval(() => {
        const state = get();
        if (state.serverUrl && !state.isSyncing) {
          state.syncNow().catch(() => {});
        }
      }, 20000);
    }
  },
}));
