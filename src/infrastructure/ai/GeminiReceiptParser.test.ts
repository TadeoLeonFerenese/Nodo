import { describe, it, expect, vi } from 'vitest';
import { GeminiReceiptParser } from './GeminiReceiptParser';

describe('GeminiReceiptParser', () => {
  it('should return simulated items when no API key is provided', async () => {
    const parser = new GeminiReceiptParser();
    const items = await parser.parseReceiptImage('test-image-data');
    expect(items.length).toBeGreaterThan(0);
    expect(items[0]).toHaveProperty('name');
    expect(items[0]).toHaveProperty('quantity');
  });

  it('should dynamically discover and sort the latest flash model from Google catalog', async () => {
    const parser = new GeminiReceiptParser();
    const mockCatalog = {
      models: [
        { name: 'models/gemini-1.5-flash', supportedGenerationMethods: ['generateContent'] },
        { name: 'models/gemini-2.0-flash', supportedGenerationMethods: ['generateContent'] },
        { name: 'models/gemini-3.5-flash', supportedGenerationMethods: ['generateContent'] },
        { name: 'models/text-embedding-004', supportedGenerationMethods: ['embedContent'] },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockCatalog,
    } as any);

    const model = await parser.discoverModel('AIzaSyTestKey');
    expect(model).toBe('gemini-3.5-flash');
  });

  it('should clean base64 data prefix when parsing', async () => {
    const parser = new GeminiReceiptParser();
    const mockOutput = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify([
                  { name: 'Café Molido 250g', quantity: 5, code: '7799988811', unitPrice: 2400 },
                ]),
              },
            ],
          },
        },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockOutput,
    } as any);

    const items = await parser.parseReceiptImage(
      'data:image/jpeg;base64,QUJDREVGR0hJSktMTU5PUA==',
      'AIzaSyTestKey',
      'gemini-3.5-flash'
    );

    expect(items).toEqual([
      { name: 'Café Molido 250g', quantity: 5, code: '7799988811', unitPrice: 2400 },
    ]);
  });
});
