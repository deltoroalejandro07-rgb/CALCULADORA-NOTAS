import "server-only";
import { supabaseServidor } from "../supabase/servidor";

/** Usuarios activos a los que se puede asignar clientes (el admin también puede llevar clientes). */
export async function listaComerciales() {
  const sb = await supabaseServidor();
  const { data } = await sb.from("perfiles").select("id, nombre, rol").eq("activo", true).neq("rol", "repartidor").order("nombre");
  return (data ?? []).map((p) => ({ id: p.id, nombre: p.rol === "admin" ? `${p.nombre} (admin)` : p.nombre }));
}
