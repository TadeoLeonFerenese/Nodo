import { describe, it, expect, vi } from 'vitest';
import { GeminiReceiptParser } from './GeminiReceiptParser';

describe('GeminiReceiptParser (Large receipt & stress testing)', () => {
  it('should cleanly parse and structure large receipts with 30+ items', async () => {
    const parser = new GeminiReceiptParser();

    // Generate 35 mock items
    const generatedItems = Array.from({ length: 35 }, (_, idx) => ({
      name: `Producto de Prueba ${idx + 1}`,
      quantity: (idx % 5) + 1,
      code: `779${String(idx).padStart(9, '0')}`,
      unitPrice: (idx + 1) * 150,
    }));

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: JSON.stringify(generatedItems) }],
            },
          },
        ],
      }),
    } as any);

    const items = await parser.parseReceiptImage('large-image', 'AIzaSyKey', 'gemini-3.5-flash');

    expect(items).toHaveLength(35);
    expect(items[0].name).toBe('Producto de Prueba 1');
    expect(items[34].name).toBe('Producto de Prueba 35');

    // Test total units calculation
    const totalUnits = items.reduce((acc, it) => acc + (it.quantity || 0), 0);
    expect(totalUnits).toBeGreaterThan(35);

    // Test total amount calculation
    const totalAmount = items.reduce((acc, it) => acc + ((it.quantity || 0) * (it.unitPrice || 0)), 0);
    expect(totalAmount).toBeGreaterThan(0);
  });
});
