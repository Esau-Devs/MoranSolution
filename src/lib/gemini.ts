// src/lib/gemini.ts
import { normalizeLeg } from './types';
//
// Toda la lógica de IA vive aquí y SOLO se ejecuta en el servidor
// (invocada desde src/pages/api/extract-ticket.ts). La API key nunca
// se envía al navegador: el cliente solo sube el archivo y recibe el
// JSON ya extraído.
const MODELS = ['gemini-3.6-flash', 'gemini-3.5-flash'];

const EXTRACTION_PROMPT = `Analiza la imagen o documento PDF adjunto de este pasaje/boleto aéreo y extrae la información.
Responde ÚNICAMENTE con un objeto JSON válido (sin bloques markdown ni explicaciones adicionales) con esta estructura:
{
  "clientName": "",
  "passportNumber": "",
  "reservationCode": "",
  "pnr": "",
  "ticketNumber": "",
  "paymentAmount": "",
  "paymentMethod": "",
  "outboundFlights": [
    {
      "airline": "", "flightNumber": "", "date": "",
      "depAirport": "", "depCity": "", "depTime": "",
      "arrAirport": "", "arrCity": "", "arrTime": "",
      "duration": "",
      "carryOn": false,
      "checkedBaggage": true,
      "checkedWeight": "23",
      "checkedPieces": "1"
    }
  ],
  "hasReturn": false,
  "returnFlights": []
}

Notas sobre equipaje:
- "carryOn": true SOLO si el boleto indica explícitamente equipaje de mano/cabina adicional (aparte del artículo personal, que siempre va incluido y no se reporta aquí).
- "checkedBaggage": true si el boleto indica equipaje documentado/facturado incluido.
- "checkedWeight": "23" o "25" según lo que indique el boleto (usa "23" si no se especifica pero sí hay equipaje documentado).
- "checkedPieces": número de piezas documentadas como texto, ej. "1" o "2". Usa "1" si hay equipaje documentado pero no se especifica cantidad.
- Si el boleto no menciona equipaje en absoluto para un tramo, deja "carryOn": false y "checkedBaggage": false.`;

export class GeminiExtractionError extends Error { }

const s = (v: unknown) => (v === null || v === undefined ? '' : String(v).trim());

// Garantiza strings (nunca null/number) y tramos con la forma correcta,
// para que el formulario y la base de datos no reciban valores raros.
function sanitizeExtraction(raw: any) {
    const d = Array.isArray(raw) ? raw[0] : raw;
    if (!d || typeof d !== 'object') throw new GeminiExtractionError('La IA devolvió un JSON inválido.');
    const outbound = Array.isArray(d.outboundFlights) ? d.outboundFlights.map(normalizeLeg) : [];
    const ret = Array.isArray(d.returnFlights) ? d.returnFlights.map(normalizeLeg) : [];
    return {
        clientName: s(d.clientName),
        passportNumber: s(d.passportNumber),
        reservationCode: s(d.reservationCode),
        pnr: s(d.pnr),
        ticketNumber: s(d.ticketNumber),
        paymentAmount: s(d.paymentAmount),
        paymentMethod: s(d.paymentMethod),
        outboundFlights: outbound,
        hasReturn: ret.length > 0,
        returnFlights: ret,
    };
}

export async function extractTicketData(base64Data: string, mimeType: string) {
    const apiKey = import.meta.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new GeminiExtractionError('GEMINI_API_KEY no está configurada en el servidor.');
    }

    const payload = {
        contents: [{
            parts: [
                { text: EXTRACTION_PROMPT },
                { inline_data: { mime_type: mimeType, data: base64Data } },
            ],
        }],
        generationConfig: { responseMimeType: 'application/json' },
    };

    let lastError: unknown;

    for (const model of MODELS) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                const data = await res.json();
                const parts: Array<{ text?: string; thought?: boolean }> = data?.candidates?.[0]?.content?.parts ?? [];
                const rawText = parts.filter((p) => !p.thought).map((p) => p.text ?? '').join('').trim();
                if (!rawText) throw new GeminiExtractionError('La IA no devolvió una respuesta válida.');

                const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
                try {
                    return sanitizeExtraction(JSON.parse(cleaned));
                } catch {
                    throw new GeminiExtractionError('La IA devolvió un JSON inválido.');
                }
            }

            // Modelo saturado/caído: probar el siguiente.
            if ([429, 500, 503].includes(res.status)) continue;

            const errBody = await res.json().catch(() => ({}));
            throw new GeminiExtractionError(errBody?.error?.message || `Error HTTP ${res.status}`);
        } catch (err) {
            lastError = err;
            if (err instanceof GeminiExtractionError) throw err;
            // Error de red: intenta con el siguiente modelo.
        }
    }

    throw new GeminiExtractionError(
        lastError instanceof Error ? lastError.message : 'No se pudo procesar el documento con ningún modelo.'
    );
}