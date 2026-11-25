// src/pages/api/auth/login.ts
// POST (formulario) email + password -> cookies de sesión.
import type { APIRoute } from 'astro';
import { setSessionCookies, supabaseAuthClient } from '../../../lib/auth';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const form = await request.formData().catch(() => null);
  const email = String(form?.get('email') ?? '').trim();
  const password = String(form?.get('password') ?? '');

  if (!email || !password) return redirect('/login?error=1');

  const { data, error } = await supabaseAuthClient().auth.signInWithPassword({ email, password });

  if (error || !data.session) {
    console.warn('[auth] Login fallido:', error?.message);
    return redirect('/login?error=1');
  }

  setSessionCookies(cookies, data.session);
  return redirect('/');
};
