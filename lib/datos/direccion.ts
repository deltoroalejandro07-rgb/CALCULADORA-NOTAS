import "server-only";
import { ESTADOS_CLIENTE, type EstadoCliente } from "../dominio/tipos";
import { fechaDentroDe } from "../dominio/visita";
import { supabaseServidor } from "../supabase/servidor";

const SEMANAS = 8;
const MESES = 6;

/** Lunes (aaaa-mm-dd, hora de Madrid) de la semana de una fecha. */
export function lunesDe(fechaIso: string): string {
  const dia = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date(fechaIso));
  const d = new Date(dia + "T12:00:00Z");
  const desdeLunes = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - desdeLunes);
  return d.toISOString().slice(0, 10);
}

export function mesDe(fechaIso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date(fechaIso)).slice(0, 7);
}

/** Indicadores del panel de dirección. Con RLS de admin ve todo el equipo. */
export async function cargarDireccion() {
  const sb = await supabaseServidor();
  const hoy = fechaDentroDe(0);
  const semanas: string[] = [];
  // Por fechas (no restando horas): así el cambio de hora no repite ni salta semanas
  const lunesActual = Date.parse(lunesDe(new Date().toISOString()) + "T12:00:00Z");
  for (let i = SEMANAS - 1; i >= 0; i--) semanas.push(new Date(lunesActual - i * 7 * 86_400_000).toISOString().slice(0, 10));
  const desde = semanas[0];
  const desdeConMargen = new Date(Date.parse(desde + "T00:00:00Z") - 86_400_000).toISOString();
  const meses: string[] = [];
  const base = new Date(hoy + "T12:00:00Z");
  for (let i = MESES - 1; i >= 0; i--) meses.push(new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() - i, 15)).toISOString().slice(0, 7));

  const [{ data: visitas }, { data: clientes }, { data: perfiles }, { data: intereses }, { data: pedidos }] = await Promise.all([
    sb.from("visitas").select("fecha, resultado, comercial_id, cliente:clientes(zona)").gte("fecha", desdeConMargen),
    sb.from("clientes").select("estado, creado_at, comercial_id"),
    sb.from("perfiles").select("id, nombre, rol, activo").order("nombre"),
    sb.from("cliente_productos_interes").select("producto_id, productos(nombre, formato)"),
    sb.from("pedidos").select("fecha, importe_total").gte("fecha", meses[0] + "-01"),
  ]);
  // Solo las de las semanas mostradas (en hora de Madrid)
  const vs = (visitas ?? []).filter((v) => lunesDe(v.fecha) >= desde);

  // Comerciales en orden fijo (por nombre): el color sigue a la persona, no a su posición en el ranking
  const conVisitas = new Set(vs.map((v) => v.comercial_id));
  const comerciales = (perfiles ?? []).filter((p) => (p.activo && p.rol === "comercial") || conVisitas.has(p.id)).map((p) => ({ id: p.id, nombre: p.nombre }));

  const visitasSemana = semanas.map((s) => ({
    semana: s,
    valores: comerciales.map((c) => vs.filter((v) => v.comercial_id === c.id && lunesDe(v.fecha) === s).length),
  }));

  const embudo = ESTADOS_CLIENTE.map((e) => ({ estado: e as EstadoCliente, n: (clientes ?? []).filter((c) => c.estado === e).length }));

  const conversion = comerciales.map((c) => {
    const suyas = vs.filter((v) => v.comercial_id === c.id);
    const pedidosN = suyas.filter((v) => v.resultado === "hace_pedido").length;
    return { ...c, visitas: suyas.length, pedidos: pedidosN, tasa: suyas.length ? pedidosN / suyas.length : 0 };
  });
  const totalPedidosVisita = vs.filter((v) => v.resultado === "hace_pedido").length;

  const nuevosMes = meses.map((m) => ({ mes: m, n: (clientes ?? []).filter((c) => mesDe(c.creado_at) === m).length }));
  const ventasMes = meses.map((m) => ({ mes: m, importe: (pedidos ?? []).filter((p) => p.fecha.startsWith(m)).reduce((s, p) => s + Number(p.importe_total), 0) }));

  const porProducto = new Map<string, number>();
  intereses?.forEach((i) => {
    const nombre = `${i.productos?.nombre ?? "?"}${i.productos?.formato ? ` · ${i.productos.formato}` : ""}`;
    porProducto.set(nombre, (porProducto.get(nombre) ?? 0) + 1);
  });
  const productos = [...porProducto.entries()].map(([nombre, n]) => ({ nombre, n })).sort((a, b) => b.n - a.n).slice(0, 8);

  const porZona = new Map<string, number>();
  vs.forEach((v) => {
    const z = v.cliente?.zona ?? "Sin zona";
    porZona.set(z, (porZona.get(z) ?? 0) + 1);
  });
  const zonas = [...porZona.entries()].map(([nombre, n]) => ({ nombre, n })).sort((a, b) => b.n - a.n).slice(0, 8);

  return {
    semanas: SEMANAS,
    comerciales,
    visitasSemana,
    totalVisitas: vs.length,
    tasaConversion: vs.length ? totalPedidosVisita / vs.length : 0,
    totalPedidosVisita,
    embudo,
    conversion,
    nuevosMes,
    ventasMes,
    productos,
    zonas,
  };
}

export type DatosDireccion = Awaited<ReturnType<typeof cargarDireccion>>;
