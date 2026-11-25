// src/lib/supabase.ts
//
// IMPORTANTE: este cliente usa la SERVICE ROLE KEY de Supabase, que tiene
// acceso total a la base de datos e ignora Row Level Security. Por eso:
//   1. Este archivo SOLO debe importarse desde código que corre en el
//      servidor: el frontmatter de archivos .astro (entre los --- ---)
//      o desde src/pages/api/**.
//   2. NUNCA lo importes desde un <script> de cliente ni desde un
//      componente de framework marcado como "client:*".
//   3. La variable SUPABASE_SERVICE_ROLE_KEY no lleva el prefijo PUBLIC_,
//      así que Astro no la expone al bundle del navegador (ver .env.example).
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.SUPABASE_URL;
const serviceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
        'Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en las variables de entorno del servidor.'
    );
}

export const supabaseServer = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
});
