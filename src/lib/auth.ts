// src/lib/auth.ts
// Autenticación con Supabase Auth (correo + contraseña). SOLO servidor.
// Los tokens viven en cookies httpOnly: el JavaScript del navegador nunca los ve.
import { createClient } from '@supabase/supabase-js';
import type { AstroCookies } from 'astro';

export const ACCESS_COOKIE = 'sb-access-token';
export const REFRESH_COOKIE = 'sb-refresh-token';

// Cliente con la ANON key, solo para signIn / refresh (no usa la service role).
export function supabaseAuthClient() {
    const url = import.meta.env.SUPABASE_URL;
    const anon = import.meta.env.SUPABASE_ANON_KEY;
    if (!url || !anon) {
        throw new Error('Faltan SUPABASE_URL o SUPABASE_ANON_KEY en las variables de entorno del servidor.');
    }
    return createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function setSessionCookies(
    cookies: AstroCookies,
    session: { access_token: string; refresh_token: string; expires_in?: number }
) {
    const base = {
        httpOnly: true,
        secure: import.meta.env.PROD,
        sameSite: 'lax' as const,
        path: '/',
    };
    cookies.set(ACCESS_COOKIE, session.access_token, { ...base, maxAge: session.expires_in ?? 3600 });
    cookies.set(REFRESH_COOKIE, session.refresh_token, { ...base, maxAge: 60 * 60 * 24 * 30 });
}

export function clearSessionCookies(cookies: AstroCookies) {
    cookies.delete(ACCESS_COOKIE, { path: '/' });
    cookies.delete(REFRESH_COOKIE, { path: '/' });
}
