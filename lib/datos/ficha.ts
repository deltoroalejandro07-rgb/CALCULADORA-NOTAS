import "server-only";
import { ofertaEncaja } from "../dominio/segmentos";
import { fechaDentroDe } from "../dominio/visita";
import { BUCKET_FOTOS } from "../offline/sincronizar";
import { supabaseServidor } from "../supabase/servidor";

/** Todo lo que muestra la ficha de un cliente. RLS decide si el usuario puede verlo. */
export async function cargarFicha(id: string) {
  const sb = await supabaseServidor();

  const { data: cliente } = await sb
    .from("clientes")
    .select("*, comercial:perfiles!clientes_comercial_id_fkey(id, nombre)")
    .eq("id", id)
    .maybeSingle();
  if (!cliente) return null;

  const [intereses, visitas, mensajes, pedidos, consentimientos, ofertas] = await Promise.all([
    sb.from("cliente_productos_interes").select("producto_id, productos(nombre, formato)").eq("cliente_id", id),
    sb
      .from("visitas")
      .select("id, fecha, tipo, resultado, notas, material_entregado, proxima_accion, proxima_accion_fecha, comercial:perfiles(nombre), visita_productos(relacion, productos(nombre)), visita_fotos(id, storage_path, tipo)")
      .eq("cliente_id", id)
      .order("fecha", { ascending: false })
      .limit(100),
    sb.from("mensajes").select("id, canal, texto, estado, creado_at, enviado_at, comercial:perfiles(nombre)").eq("cliente_id", id).order("creado_at", { ascending: false }).limit(100),
    sb.from("pedidos").select("id, fecha, importe_total, notas, pedido_lineas(descripcion, cantidad, precio_unitario, importe)").eq("cliente_id", id).order("fecha", { ascending: false }).limit(100),
    sb.from("consentimientos").select("id, canal, otorgado, origen, evidencia, registrado_at").eq("cliente_id", id).order("registrado_at", { ascending: false }),
    sb.from("ofertas").select("id, titulo, condicion, descripcion, fecha_inicio, fecha_fin, activa, segmento_tipos, segmento_zonas, segmento_estados, segmento_productos"),
  ]);

  // Fotos: URLs firmadas de 1 hora (el bucket es privado)
  const rutas = (visitas.data ?? []).flatMap((v) => v.visita_fotos.map((f) => f.storage_path));
  const firmadas = new Map<string, string>();
  if (rutas.length) {
    const { data } = await sb.storage.from(BUCKET_FOTOS).createSignedUrls(rutas, 3600);
    data?.forEach((d) => d.path && d.signedUrl && firmadas.set(d.path, d.signedUrl));
  }

  const idsInteres = (intereses.data ?? []).map((i) => i.producto_id);
  const hoy = fechaDentroDe(0);
  const ofertasQueEncajan = (ofertas.data ?? []).filter((o) =>
    ofertaEncaja(o, { tipo: cliente.tipo, zona: cliente.zona, estado: cliente.estado, intereses: idsInteres }, hoy),
  );

  return {
    cliente,
    intereses: (intereses.data ?? []).map((i) => ({ id: i.producto_id, nombre: i.productos?.nombre ?? "", formato: i.productos?.formato ?? null })),
    visitas: (visitas.data ?? []).map((v) => ({
      ...v,
      fotos: v.visita_fotos.map((f) => ({ ...f, url: firmadas.get(f.storage_path) ?? null })),
    })),
    mensajes: mensajes.data ?? [],
    pedidos: pedidos.data ?? [],
    consentimientos: consentimientos.data ?? [],
    ofertas: ofertasQueEncajan,
  };
}

export type Ficha = NonNullable<Awaited<ReturnType<typeof cargarFicha>>>;
