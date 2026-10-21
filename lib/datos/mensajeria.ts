import "server-only";
import { fechaDentroDe } from "../dominio/visita";
import { supabaseServidor } from "../supabase/servidor";

/** Plantillas activas y ofertas vigentes (con sus productos) para preparar mensajes. */
export async function datosParaMensajes() {
  const sb = await supabaseServidor();
  const hoy = fechaDentroDe(0);
  const [{ data: plantillas }, { data: ofertas }] = await Promise.all([
    sb.from("plantillas").select("id, nombre, canal, asunto, cuerpo").eq("activa", true).order("nombre"),
    sb
      .from("ofertas")
      .select("id, titulo, fecha_inicio, fecha_fin, activa, segmento_tipos, segmento_zonas, segmento_estados, segmento_productos, oferta_productos(productos(nombre))")
      .eq("activa", true)
      .lte("fecha_inicio", hoy)
      .gte("fecha_fin", hoy)
      .order("fecha_fin"),
  ]);
  return {
    plantillas: plantillas ?? [],
    ofertas: (ofertas ?? []).map(({ oferta_productos, ...o }) => ({ ...o, productos: oferta_productos.map((p) => p.productos?.nombre ?? "").filter(Boolean) })),
  };
}

export type PlantillaMensaje = Awaited<ReturnType<typeof datosParaMensajes>>["plantillas"][number];
export type OfertaMensaje = Awaited<ReturnType<typeof datosParaMensajes>>["ofertas"][number];
