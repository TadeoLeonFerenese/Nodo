import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAiStore } from './useAiStore';

const createLocalStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
};

describe('useAiStore', () => {
  let storageMock: ReturnType<typeof createLocalStorageMock>;

  beforeEach(() => {
    storageMock = createLocalStorageMock();
    vi.stubGlobal('localStorage', storageMock);
    vi.stubGlobal('window', { localStorage: storageMock });

    useAiStore.setState({
      apiKey: '',
      activeModel: 'gemini-3.5-flash',
      isValidating: false,
      validationStatus: 'idle',
      validationMessage: null,
    });
    vi.restoreAllMocks();
  });

  it('should initialize with empty key and default model', () => {
    const state = useAiStore.getState();
    expect(state.apiKey).toBe('');
    expect(state.activeModel).toBe('gemini-3.5-flash');
    expect(state.validationStatus).toBe('idle');
  });

  it('should save api key to localStorage and state', async () => {
    // Mock successful fetch for model discovery
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        models: [
          { name: 'models/gemini-3.5-flash', supportedGenerationMethods: ['generateContent'] },
        ],
      }),
    }));

    await useAiStore.getState().setApiKey('AIzaSyTest123');
    expect(useAiStore.getState().apiKey).toBe('AIzaSyTest123');
    expect(storageMock.getItem('nodo_ai_api_key')).toBe('AIzaSyTest123');
    expect(useAiStore.getState().validationStatus).toBe('valid');
  });

  it('should clear api key and reset state', async () => {
    useAiStore.setState({ apiKey: 'AIzaSyTest123', validationStatus: 'valid' });
    storageMock.setItem('nodo_ai_api_key', 'AIzaSyTest123');

    useAiStore.getState().clearApiKey();
    expect(useAiStore.getState().apiKey).toBe('');
    expect(storageMock.getItem('nodo_ai_api_key')).toBeNull();
    expect(useAiStore.getState().validationStatus).toBe('idle');
  });
});
