import { create } from 'zustand';
import { GeminiReceiptParser } from '../../infrastructure/ai/GeminiReceiptParser';

const API_KEY_STORAGE = 'nodo_ai_api_key';

interface AiState {
  apiKey: string;
  activeModel: string;
  isValidating: boolean;
  validationStatus: 'idle' | 'valid' | 'invalid';
  validationMessage: string | null;

  setApiKey: (key: string) => Promise<void>;
  clearApiKey: () => void;
  validateConnection: (keyToTest?: string) => Promise<boolean>;
  initAiEngine: () => void;
}

export const useAiStore = create<AiState>((set, get) => ({
  apiKey: typeof window !== 'undefined' ? localStorage.getItem(API_KEY_STORAGE) || '' : '',
  activeModel: 'gemini-3.5-flash',
  isValidating: false,
  validationStatus: 'idle',
  validationMessage: null,

  setApiKey: async (key: string) => {
    const trimmed = key.trim();
    if (typeof window !== 'undefined') {
      if (trimmed) {
        localStorage.setItem(API_KEY_STORAGE, trimmed);
      } else {
        localStorage.removeItem(API_KEY_STORAGE);
      }
    }
    set({
      apiKey: trimmed,
      validationStatus: 'idle',
      validationMessage: null,
    });
    if (trimmed) {
      await get().validateConnection(trimmed);
    } else {
      set({ activeModel: 'gemini-3.5-flash', validationStatus: 'idle', validationMessage: null });
    }
  },

  clearApiKey: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(API_KEY_STORAGE);
    }
    set({
      apiKey: '',
      activeModel: 'gemini-3.5-flash',
      validationStatus: 'idle',
      validationMessage: null,
    });
  },

  validateConnection: async (keyToTest?: string) => {
    const key = keyToTest !== undefined ? keyToTest.trim() : get().apiKey.trim();
    if (!key) {
      set({ validationStatus: 'idle', validationMessage: null });
      return false;
    }

    set({ isValidating: true, validationMessage: null });
    try {
      const parser = new GeminiReceiptParser();
      const model = await parser.discoverModel(key);
      set({
        activeModel: model,
        isValidating: false,
        validationStatus: 'valid',
        validationMessage: `Conexión verificada: ${model}`,
      });
      return true;
    } catch (err) {
      set({
        isValidating: false,
        validationStatus: 'invalid',
        validationMessage: (err as Error).message || 'Error al conectar con la API de IA',
      });
      return false;
    }
  },

  initAiEngine: () => {
    const key = get().apiKey;
    if (key) {
      get().validateConnection(key).catch(() => {});
    }
  },
}));
