import { create } from 'zustand';
import { SyncService } from '../../infrastructure/sync/SyncService';
import { isTauri } from '../../utils/platform';

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
  autoDiscoverServer: () => Promise<boolean>;
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
    if (!isTauri()) return;

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

  autoDiscoverServer: async () => {
    // 1. Probar la URL actualmente guardada primero
    const current = get().serverUrl;
    if (current && (await SyncService.getInstance().pingServer(current))) {
      set({ isServerOnline: true, error: null });
      await get().syncNow();
      return true;
    }

    set({ isSyncing: true, error: null });

    // 2. Lista de IPs prioritarias a sondear en puerto 4545
    const candidateIps: string[] = ['192.168.0.3', '192.168.1.3', '192.168.0.2', '192.168.1.2', '192.168.0.100', '192.168.1.100'];
    for (let i = 2; i <= 35; i++) {
      candidateIps.push(`192.168.0.${i}`);
      candidateIps.push(`192.168.1.${i}`);
    }

    const checkIp = async (ip: string): Promise<string | null> => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 900);
        const res = await fetch(`http://${ip}:4545/api/ping`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (res.ok) {
          const data = (await res.json()) as { status?: string };
          if (data.status === 'nodo-online') {
            return `http://${ip}:4545`;
          }
        }
      } catch {
        // timeout o no responde
      }
      return null;
    };

    // Sondear en paralelo por bloques de 10
    const chunkSize = 10;
    for (let i = 0; i < candidateIps.length; i += chunkSize) {
      const chunk = candidateIps.slice(i, i + chunkSize);
      const results = await Promise.all(chunk.map((ip) => checkIp(ip)));
      const found = results.find((r) => r !== null);
      if (found) {
        await get().setServerUrl(found);
        set({ isSyncing: false, error: null });
        return true;
      }
    }

    set({ isSyncing: false, error: 'No se encontró la PC en la red Wi-Fi local. Podés conectarte ingresando su IP manualmente.' });
    return false;
  },

  initSyncEngine: () => {
    get().refreshPendingCount();

    if (isTauri()) {
      get().fetchLocalServerIp();
      // Listen for incoming sync batches from Android
      import('@tauri-apps/api/event').then(({ listen }) => {
        listen<string>('sync-batch-received', async (event) => {
          const applied = await SyncService.getInstance().applyIncomingBatch(event.payload);
          if (applied > 0) {
            // Trigger refresh in stores
            const { useProductStore } = await import('./useProductStore');
            useProductStore.getState().loadProducts();
            const { useStockStore } = await import('./useStockStore');
            useStockStore.getState().loadMovements();
            useStockStore.getState().loadLowStockAlerts();
          }
        });
      });
    } else {
      // On Android / Mobile:
      // Si no tenemos URL de PC configurada, intentar autodescubrimiento en segundo plano
      if (!get().serverUrl) {
        get().autoDiscoverServer().catch(() => {});
      } else {
        get().checkServerHealth();
      }

      // Sincronización continua cada 5 segundos si hay conexión
      setInterval(() => {
        const state = get();
        if (state.serverUrl && !state.isSyncing) {
          state.syncNow().catch(() => {});
        } else if (!state.serverUrl && !state.isSyncing) {
          state.autoDiscoverServer().catch(() => {});
        }
      }, 5000);
    }
  },
}));
