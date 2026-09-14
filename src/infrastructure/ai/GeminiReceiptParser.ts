import { ReceiptItem } from '../../domain/entities/Receipt';

export class GeminiReceiptParser {
  private static cachedModel: string | null = null;

  /**
   * Descubre dinámicamente el mejor modelo multimodal disponible para la API Key provista
   * consultando el endpoint de catálogo de Google sin hardcodear versiones fijas.
   */
  async discoverModel(apiKey: string): Promise<string> {
    if (GeminiReceiptParser.cachedModel) {
      return GeminiReceiptParser.cachedModel;
    }

    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (res.ok) {
        const data = (await res.json()) as {
          models?: Array<{
            name: string;
            supportedGenerationMethods?: string[];
          }>;
        };

        if (data.models && Array.isArray(data.models)) {
          const generationModels = data.models.filter((m) =>
            m.supportedGenerationMethods?.includes('generateContent')
          );

          // Filtrar variantes flash y ordenar por versión descendente (ej: 3.8, 3.6, 3.5, etc.)
          const flashModels = generationModels
            .map((m) => m.name.replace(/^models\//, ''))
            .filter((name) => name.toLowerCase().includes('flash'));

          if (flashModels.length > 0) {
            flashModels.sort((a, b) => {
              const matchA = a.match(/([0-9]+(?:\.[0-9]+)?)/);
              const matchB = b.match(/([0-9]+(?:\.[0-9]+)?)/);
              const verA = matchA ? parseFloat(matchA[1]) : 0;
              const verB = matchB ? parseFloat(matchB[1]) : 0;
              return verB - verA;
            });

            GeminiReceiptParser.cachedModel = flashModels[0];
            return flashModels[0];
          }

          if (generationModels.length > 0) {
            const chosen = generationModels[0].name.replace(/^models\//, '');
            GeminiReceiptParser.cachedModel = chosen;
            return chosen;
          }
        }
      }
    } catch (err) {
      console.warn('[GeminiReceiptParser] Error discovering models dynamically:', err);
    }

    // Fallback por defecto si no es posible consultar el catálogo
    return 'gemini-3.5-flash';
  }

  async parseReceiptImage(
    base64Image: string,
    apiKey?: string,
    customModel?: string
  ): Promise<ReceiptItem[]> {
    console.log('[GeminiReceiptParser] Processing receipt image (base64 length:', base64Image.length, ')');

    // Limpieza de prefijo data:image/...;base64, si estuviera presente
    const cleanBase64 = base64Image.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');

    // Simulación guiada si no se configuró API key
    if (!apiKey) {
      console.warn('[GeminiReceiptParser] No API key provided, returning simulated structured data.');
      return [
        { name: 'Aceite de Girasol 1.5L', quantity: 12, code: '779123456701', unitPrice: 1250 },
        { name: 'Harina de Trigo 000 1kg', quantity: 20, code: '779123456702', unitPrice: 480 },
        { name: 'Fideos Tallarines 500g', quantity: 15, code: '779123456703', unitPrice: 620 },
      ];
    }

    // Soporte para proveedores alternativos (OpenAI)
    if (apiKey.startsWith('sk-')) {
      return this.parseWithOpenAI(cleanBase64, apiKey, customModel);
    }

    // Resolución dinámica de modelo para Google Gemini
    const model = customModel || (await this.discoverModel(apiKey));
    console.log(`[GeminiReceiptParser] Using dynamically resolved model: ${model}`);

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: 'Actúa como un sistema OCR de inventario. Extrae detalladamente todos los productos, sus cantidades numéricas y precio unitario si figura en este remito o factura. Devuelve ÚNICAMENTE un array JSON válido sin texto adicional, con el formato: [{"name": string, "quantity": number, "code": string, "unitPrice": number}]. Si no hay código visible, genera un código numérico razonable.',
                  },
                  {
                    inline_data: {
                      mime_type: 'image/jpeg',
                      data: cleanBase64,
                    },
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.1,
              response_mime_type: 'application/json',
            },
          }),
        }
      );

      if (!response.ok) {
        const errText = await response.text();
        console.error(`[GeminiReceiptParser] API error (${response.status}):`, errText);
        throw new Error(`Error en API de IA (${response.status}): ${response.statusText}`);
      }

      const data = await response.json();
      const textOutput = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!textOutput) return [];

      const jsonMatch = textOutput.match(/\[.*\]/s);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as ReceiptItem[];
      }
      return [];
    } catch (error) {
      console.error('[GeminiReceiptParser] Error calling AI service:', error);
      throw error;
    }
  }

  private async parseWithOpenAI(
    cleanBase64: string,
    apiKey: string,
    customModel?: string
  ): Promise<ReceiptItem[]> {
    const model = customModel || 'gpt-4o-mini';
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content:
              'Eres un analizador OCR de remitos comerciales. Responde exclusivamente con un JSON array de objetos con formato: [{"name": string, "quantity": number, "code": string, "unitPrice": number}].',
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Extrae los productos y cantidades de este remito.' },
              {
                type: 'image_url',
                image_url: { url: `data:image/jpeg;base64,${cleanBase64}` },
              },
            ],
          },
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return [];

    const jsonMatch = content.match(/\[.*\]/s);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as ReceiptItem[];
    }
    return [];
  }
}
