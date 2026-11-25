// src/pages/api/reservations/index.ts
// GET  -> lista todas las reservas
// POST -> crea una reserva nueva
import type { APIRoute } from 'astro';
import { supabaseServer } from '../../../lib/supabase';
import { reservationToRow, rowToReservation, type ReservationRow } from '../../../lib/types';

export const prerender = false;

export const GET: APIRoute = async () => {
  const { data, error } = await supabaseServer
    .from('reservations')
    .select('*')
    .order('created_date', { ascending: false });

  if (error) {
    return new Response(
      JSON.stringify({ error: 'No se pudieron cargar las reservas.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const reservations = (data as ReservationRow[]).map(rowToReservation);
  return new Response(JSON.stringify(reservations), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => null);

  if (!body || typeof body.clientName !== 'string' || !body.clientName.trim()) {
    return new Response(
      JSON.stringify({ error: 'El nombre del cliente es obligatorio.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const now = new Date().toISOString();
  // Generamos id y timestamps aquí: no dependemos de los DEFAULT de la tabla.
  const rowData = {
    id: crypto.randomUUID(),
    ...reservationToRow({ ...body, id: undefined }),
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await supabaseServer
    .from('reservations')
    .insert(rowData)
    .select()
    .single();

  if (error) {
    console.error('[API /api/reservations] POST Error en Supabase:', error);
    return new Response(
      JSON.stringify({ error: `No se pudo guardar la reserva: ${error.message}` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return new Response(JSON.stringify(rowToReservation(data as ReservationRow)), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};