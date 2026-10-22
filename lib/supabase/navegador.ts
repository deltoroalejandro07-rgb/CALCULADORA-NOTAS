import { createBrowserClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./tipos-bd";

export function supabaseNavegador() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}

/**
 * Solo para pedir el email de acceso. `createBrowserClient` fuerza el flujo PKCE, que ata
 * el enlace al navegador donde se pidió: en el móvil el enlace suele abrirse en otro
 * (Mail → Safari, Gmail → su navegador interno) y fallaba. Con el flujo implícito el
 * enlace trae la sesión y funciona se abra donde se abra; /auth/confirmar la recoge.
 */
export function supabaseEnvioAcceso() {
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { flowType: "implicit", persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
