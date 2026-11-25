// src/pages/api/reservations/[id].ts
// GET/PUT/DELETE sobre una reserva puntual.
import type { APIRoute } from 'astro';
import { supabaseServer } from '../../../lib/supabase';
import { reservationToRow, rowToReservation, type ReservationRow } from '../../../lib/types';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const { id } = params;
  console.log(`[API /api/reservations/${id}] GET solicitado`);

  const { data, error } = await supabaseServer
    .from('reservations')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    console.error(`[API /api/reservations/${id}] GET Error o no encontrado:`, error);
    return new Response(JSON.stringify({ error: 'Reserva no encontrada.' }), { status: 404 });
  }

  console.log(`[API /api/reservations/${id}] GET Exitoso`);
  return new Response(JSON.stringify(rowToReservation(data as ReservationRow)), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const PUT: APIRoute = async ({ params, request }) => {
  const { id } = params;
  console.log(`[API /api/reservations/${id}] PUT solicitado`);

  const body = await request.json().catch((err) => {
    console.error(`[API /api/reservations/${id}] Error parseando JSON en PUT:`, err);
    return null;
  });

  if (!body || typeof body.clientName !== 'string' || !body.clientName.trim()) {
    console.warn(`[API /api/reservations/${id}] PUT Fallo de validación en clientName:`, body);
    return new Response(JSON.stringify({ error: 'El nombre del cliente es obligatorio.' }), { status: 400 });
  }

  const rowPayload = { ...reservationToRow({ ...body, id: undefined }), updated_at: new Date().toISOString() };
  console.log(`[API /api/reservations/${id}] Ejecutando update en Supabase`);

  const { data, error } = await supabaseServer
    .from('reservations')
    .update(rowPayload)
    .eq('id', id)
    .select()
    .single();

  if (error || !data) {
    console.error(`[API /api/reservations/${id}] PUT Error en Supabase:`, error);
    return new Response(
      JSON.stringify({ error: `No se pudo actualizar la reserva: ${error?.message ?? 'sin datos'}` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  console.log(`[API /api/reservations/${id}] PUT Actualización exitosa`);
  return new Response(JSON.stringify(rowToReservation(data as ReservationRow)), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const DELETE: APIRoute = async ({ params }) => {
  const { id } = params;
  console.log(`[API /api/reservations/${id}] DELETE solicitado`);

  const { error } = await supabaseServer.from('reservations').delete().eq('id', id);

  if (error) {
    console.error(`[API /api/reservations/${id}] DELETE Error en Supabase:`, error);
    return new Response(JSON.stringify({ error: 'No se pudo eliminar la reserva.' }), { status: 500 });
  }

  console.log(`[API /api/reservations/${id}] DELETE Eliminación exitosa`);
  return new Response(null, { status: 204 });
};