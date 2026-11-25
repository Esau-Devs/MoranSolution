// src/middleware.ts
// Protege TODAS las páginas y APIs excepto el login y los archivos estáticos.
import { defineMiddleware } from 'astro:middleware';
import { supabaseServer } from './lib/supabase';
import { ACCESS_COOKIE, REFRESH_COOKIE, clearSessionCookies, setSessionCookies, supabaseAuthClient } from './lib/auth';

const PUBLIC_PATHS = ['/login', '/api/auth/login', '/robots.txt'];
const STATIC_FILE = /\.(?:jpe?g|png|svg|ico|webp|gif|css|js|map|woff2?|txt)$/i;

export const onRequest = defineMiddleware(async (context, next) => {
    const { pathname } = context.url;

    if (PUBLIC_PATHS.includes(pathname) || pathname.startsWith('/_astro/') || STATIC_FILE.test(pathname)) {
        return next();
    }

    const access = context.cookies.get(ACCESS_COOKIE)?.value;
    const refresh = context.cookies.get(REFRESH_COOKIE)?.value;
    let authenticated = false;

    // 1) Token de acceso vigente
    if (access) {
        const { data, error } = await supabaseServer.auth.getUser(access);
        if (!error && data.user) authenticated = true;
    }

    // 2) Token vencido/ausente: renovar con el refresh token
    if (!authenticated && refresh) {
        const { data, error } = await supabaseAuthClient().auth.refreshSession({ refresh_token: refresh });
        if (!error && data.session) {
            setSessionCookies(context.cookies, data.session);
            authenticated = true;
        }
    }

    if (authenticated) return next();

    clearSessionCookies(context.cookies);

    if (pathname.startsWith('/api/')) {
        return new Response(JSON.stringify({ error: 'No autorizado.' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
        });
    }
    return context.redirect('/login');
});
