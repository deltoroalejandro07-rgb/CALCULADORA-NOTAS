import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./tipos-bd";

/**
 * Cliente con la clave secreta: se salta RLS. Solo para tareas de administración
 * (crear usuarios) y siempre después de comprobar que quien llama es admin.
 * Devuelve null si SUPABASE_SECRET_KEY no está configurada.
 */
export function supabaseAdmin() {
  const clave = process.env.SUPABASE_SECRET_KEY;
  if (!clave) return null;
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, clave, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
