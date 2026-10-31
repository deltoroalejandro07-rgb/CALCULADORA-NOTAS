import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { preverPedidos } from "@/lib/dominio/prevision";
import { clientesEnRiesgo } from "@/lib/dominio/sugerencias";
import { TEXTO_ESTADO, TEXTO_RESULTADO, TEXTO_TIPO_NEGOCIO, type EstadoCliente, type ResultadoVisita } from "@/lib/dominio/tipos";
import { normalizarTexto } from "@/lib/dominio/visita";
import type { Database } from "@/lib/supabase/tipos-bd";

// Consultas de solo lectura que usa la IA. Van con el cliente de Supabase del usuario, así que
// respetan sus permisos (RLS): la IA nunca ve más de lo que ve quien pregunta.

type Sb = SupabaseClient<Database>;
const contar = <T>(xs: T[], clave: (x: T) => string | null | undefined) => {
  const m: Record<string, number> = {};
  for (const x of xs) {
    const k = clave(x) ?? "—";
    m[k] = (m[k] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(m).sort((a, b) => b[1] - a[1]));
};
const sumarDias = (d: string, n: number) => new Date(Date.parse(d + "T12:00:00Z") + n * 86_400_000).toISOString().slice(0, 10);
const corta = (t: string | null, n = 160) => (t && t.length > n ? t.slice(0, n) + "…" : t);

export async function buscarClientes(
  sb: Sb,
  hoy: string,
  f: { texto?: string; estado?: EstadoCliente; zona?: string; comercial?: string; sin_visita_dias?: number; seguimiento_vencido?: boolean; limite?: number },
) {
  let q = sb
    .from("clientes")
    .select("id, nombre_negocio, tipo, zona, localidad, estado, telefono, ultima_visita_at, ultimo_resultado, ultimo_resultado_at, proxima_accion, proxima_accion_fecha, notas, comercial:perfiles!clientes_comercial_id_fkey(nombre)");
  if (f.estado) q = q.eq("estado", f.estado);
  if (f.zona) q = q.ilike("zona", `%${f.zona}%`);
  if (f.seguimiento_vencido) q = q.lt("proxima_accion_fecha", hoy);
  if (f.sin_visita_dias) q = q.or(`ultima_visita_at.is.null,ultima_visita_at.lt.${sumarDias(hoy, -f.sin_visita_dias)}`);
  const { data, error } = await q.limit(1000);
  if (error) throw error;
  let lista = data ?? [];
  if (f.texto) {
    const t = normalizarTexto(f.texto);
    lista = lista.filter((c) => normalizarTexto(`${c.nombre_negocio} ${c.zona ?? ""} ${c.localidad ?? ""} ${c.notas ?? ""}`).includes(t));
  }
  if (f.comercial) {
    const t = normalizarTexto(f.comercial);
    lista = lista.filter((c) => normalizarTexto(c.comercial?.nombre ?? "").includes(t));
  }
  return {
    total: lista.length,
    por_estado: contar(lista, (c) => TEXTO_ESTADO[c.estado]),
    clientes: lista.slice(0, Math.min(f.limite ?? 40, 80)).map((c) => ({
      nombre: c.nombre_negocio,
      tipo: TEXTO_TIPO_NEGOCIO[c.tipo],
      zona: c.zona,
      estado: TEXTO_ESTADO[c.estado],
      comercial: c.comercial?.nombre ?? null,
      ultima_visita: c.ultima_visita_at?.slice(0, 10) ?? null,
      ultimo_resultado: c.ultimo_resultado ? TEXTO_RESULTADO[c.ultimo_resultado] : null,
      proxima_accion: c.proxima_accion_fecha ? `${c.proxima_accion ?? "Seguimiento"} (${c.proxima_accion_fecha})` : null,
      notas: corta(c.notas),
    })),
  };
}

export async function consultarVisitas(sb: Sb, f: { desde: string; hasta: string; comercial?: string; resultado?: ResultadoVisita; zona?: string }) {
  let q = sb
    .from("visitas")
    .select("fecha, tipo, resultado, notas, proxima_accion, clientes(nombre_negocio, zona, estado), comercial:perfiles!visitas_comercial_id_fkey(nombre)")
    .gte("fecha", f.desde + "T00:00:00")
    .lte("fecha", f.hasta + "T23:59:59")
    .order("fecha", { ascending: false });
  if (f.resultado) q = q.eq("resultado", f.resultado);
  const { data, error } = await q.limit(2000);
  if (error) throw error;
  let lista = data ?? [];
  if (f.comercial) lista = lista.filter((v) => normalizarTexto(v.comercial?.nombre ?? "").includes(normalizarTexto(f.comercial!)));
  if (f.zona) lista = lista.filter((v) => normalizarTexto(v.clientes?.zona ?? "").includes(normalizarTexto(f.zona!)));
  return {
    total: lista.length,
    por_comercial: contar(lista, (v) => v.comercial?.nombre),
    por_resultado: contar(lista, (v) => TEXTO_RESULTADO[v.resultado]),
    por_zona: contar(lista, (v) => v.clientes?.zona),
    visitas: lista.slice(0, 60).map((v) => ({
      fecha: v.fecha.slice(0, 10),
      cliente: v.clientes?.nombre_negocio,
      zona: v.clientes?.zona,
      comercial: v.comercial?.nombre,
      resultado: TEXTO_RESULTADO[v.resultado],
      notas: corta(v.notas, 120),
    })),
  };
}

export async function consultarReparto(sb: Sb, f: { desde: string; hasta: string }) {
  const { data, error } = await sb
    .from("paradas")
    .select("estado, motivo_fallo, cobrado, realizada_at, destinos(nombre), clientes(nombre_negocio), rutas!inner(fecha, conductor:perfiles!rutas_conductor_id_fkey(nombre), vehiculos(nombre))")
    .gte("rutas.fecha", f.desde)
    .lte("rutas.fecha", f.hasta)
    .limit(3000);
  if (error) throw error;
  const lista = data ?? [];
  const nombre = (p: (typeof lista)[number]) => p.destinos?.nombre ?? p.clientes?.nombre_negocio ?? "—";
  return {
    paradas: lista.length,
    por_estado: contar(lista, (p) => p.estado),
    motivos_no_entregado: contar(
      lista.filter((p) => p.estado === "fallida"),
      (p) => p.motivo_fallo,
    ),
    por_conductor: contar(lista, (p) => p.rutas?.conductor?.nombre),
    cobrado_total_eur: Math.round(lista.reduce((s, p) => s + (Number(p.cobrado) || 0), 0) * 100) / 100,
    no_entregadas: lista
      .filter((p) => p.estado === "fallida")
      .slice(0, 40)
      .map((p) => ({ cliente: nombre(p), motivo: p.motivo_fallo, fecha: p.rutas?.fecha })),
  };
}

export async function consultarAlbaranes(sb: Sb, f: { desde: string; hasta: string; cliente?: string }) {
  const { data, error } = await sb
    .from("albaranes")
    .select("numero, fecha, creado_at, estado, lineas, destinos(nombre, localidad)")
    .neq("estado", "anulado")
    .gte("creado_at", f.desde + "T00:00:00")
    .lte("creado_at", f.hasta + "T23:59:59")
    .limit(3000);
  if (error) throw error;
  let lista = data ?? [];
  if (f.cliente) lista = lista.filter((a) => normalizarTexto(a.destinos?.nombre ?? "").includes(normalizarTexto(f.cliente!)));
  const productos: Record<string, number> = {};
  for (const a of lista) for (const l of (a.lineas as { descripcion?: string; cantidad?: number }[] | null) ?? []) if (l.descripcion) productos[l.descripcion] = (productos[l.descripcion] ?? 0) + (Number(l.cantidad) || 0);
  return {
    albaranes: lista.length,
    por_estado: contar(lista, (a) => a.estado),
    por_cliente: Object.fromEntries(Object.entries(contar(lista, (a) => a.destinos?.nombre)).slice(0, 30)),
    productos_mas_repartidos: Object.fromEntries(
      Object.entries(productos)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20),
    ),
  };
}

export async function riesgoYPrevision(sb: Sb, hoy: string) {
  const [{ data: clientes }, { data: albs }] = await Promise.all([
    sb
      .from("clientes")
      .select("id, nombre_negocio, estado, lat, lng, ultimo_resultado, ultimo_resultado_at, ultima_visita_at, proxima_accion, proxima_accion_fecha, horario_visita, comercial:perfiles!clientes_comercial_id_fkey(nombre)")
      .in("estado", ["cliente", "interesado"]),
    sb.from("albaranes").select("destino_id, fecha, creado_at, destinos(nombre)").neq("estado", "anulado").gte("creado_at", sumarDias(hoy, -180)),
  ]);
  const nombres = new Map((albs ?? []).map((a) => [a.destino_id, a.destinos?.nombre ?? "—"]));
  return {
    clientes_en_riesgo: clientesEnRiesgo(clientes ?? [], hoy).slice(0, 25).map((r) => ({ cliente: r.cliente.nombre_negocio, comercial: r.cliente.comercial?.nombre ?? null, gravedad: r.gravedad, motivo: r.motivo })),
    les_toca_pedir: preverPedidos((albs ?? []).map((a) => ({ destinoId: a.destino_id, fecha: a.fecha ?? a.creado_at.slice(0, 10) })), hoy)
      .slice(0, 25)
      .map((p) => ({ cliente: nombres.get(p.destinoId), estado: p.estado === "toca" ? "le toca ya" : "pronto", pide_cada_dias: p.cadaDias, dias_desde_ultimo: p.diasDesdeUltimo })),
  };
}

export { sumarDias };
