import { ReceiptItem } from '../../domain/entities/Receipt';

export class GeminiReceiptParser {
  async parseReceiptImage(base64Image: string, apiKey?: string): Promise<ReceiptItem[]> {
    console.log('[GeminiReceiptParser] Processing receipt image (base64 length:', base64Image.length, ')');

    // Simulate structured extraction from LLM Vision API
    if (!apiKey) {
      console.warn('[GeminiReceiptParser] No API key provided, returning simulated structured data.');
      return [
        { name: 'Aceite de Girasol 1.5L', quantity: 12, code: '779123456701', unitPrice: 1250 },
        { name: 'Harina de Trigo 000 1kg', quantity: 20, code: '779123456702', unitPrice: 480 },
        { name: 'Fideos Tallarines 500g', quantity: 15, code: '779123456703', unitPrice: 620 },
      ];
    }

    // Production payload format for Gemini Structured Output
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: 'Extrae estructuradamente los productos y cantidades de este remito en JSON con formato: [{"name": string, "quantity": number, "code": string}].' },
                { inline_data: { mime_type: 'image/jpeg', data: base64Image } }
              ]
            }
          ]
        })
      });

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
      throw new Error('Failed to process receipt image with AI.');
    }
  }
}
