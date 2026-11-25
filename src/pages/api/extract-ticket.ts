// src/pages/api/extract-ticket.ts
// POST { base64Data: string, mimeType: string } -> JSON extraído del boleto.
// El cliente NUNCA ve la API key de Gemini: solo llama a esta ruta.
import type { APIRoute } from 'astro';
import { extractTicketData, GeminiExtractionError } from '../../lib/gemini';

export const prerender = false;

const MAX_BASE64_LENGTH = 15_000_000; // ~11 MB de archivo original, margen para PDFs/fotos.

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { base64Data, mimeType } = body ?? {};

    if (typeof base64Data !== 'string' || typeof mimeType !== 'string') {
      return new Response(JSON.stringify({ error: 'base64Data y mimeType son requeridos.' }), { status: 400 });
    }
    if (base64Data.length > MAX_BASE64_LENGTH) {
      return new Response(JSON.stringify({ error: 'El archivo es demasiado grande.' }), { status: 413 });
    }

    const parsed = await extractTicketData(base64Data, mimeType);
    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof GeminiExtractionError
      ? err.message
      : 'Error inesperado al procesar el documento.';
    console.error('extract-ticket error:', err);
    return new Response(JSON.stringify({ error: message }), { status: 502 });
  }
};
