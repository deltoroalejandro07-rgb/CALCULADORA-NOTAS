import "server-only";
import { supabaseServidor } from "../supabase/servidor";

/** Clientes visibles para el usuario (RLS) con lo necesario para segmentar ofertas y campañas. */
export async function clientesParaSegmentar() {
  const sb = await supabaseServidor();
  const [{ data: clientes }, { data: intereses }] = await Promise.all([
    sb
      .from("clientes")
      .select("id, nombre_negocio, tipo, zona, estado, contacto_nombre, telefono, email, consiente_whatsapp, consiente_email, comercial_id, is_seed")
      .order("nombre_negocio"),
    sb.from("cliente_productos_interes").select("cliente_id, producto_id"),
  ]);
  const porCliente = new Map<string, string[]>();
  intereses?.forEach((i) => porCliente.set(i.cliente_id, [...(porCliente.get(i.cliente_id) ?? []), i.producto_id]));
  return (clientes ?? []).map((c) => ({ ...c, intereses: porCliente.get(c.id) ?? [] }));
}

export type ClienteSegmento = Awaited<ReturnType<typeof clientesParaSegmentar>>[number];

export function urlImagenProducto(path: string | null): string | null {
  return path ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/productos/${path}` : null;
}
