import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./tipos-bd";

/** Cliente con la sesión del usuario: todas las consultas pasan por RLS. */
export async function supabaseServidor() {
  const almacen = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => almacen.getAll(),
        setAll: (lista) => {
          try {
            lista.forEach(({ name, value, options }) => almacen.set(name, value, options));
          } catch {
            // Desde un Server Component no se pueden escribir cookies; el proxy ya renueva la sesión.
          }
        },
      },
    },
  );
}
