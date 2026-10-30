"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { exigirAdmin } from "@/lib/auth";
import { ETIQUETAS_AMBIENTALES, moverParada } from "@/lib/dominio/reparto";
import { ordenarRuta } from "@/lib/dominio/ruta";
import { supabaseServidor } from "@/lib/supabase/servidor";

export interface EstadoForm {
  error?: string;
  ok?: string;
}

const vacioANull = (v: unknown) => (v == null || (typeof v === "string" && v.trim() === "") ? null : typeof v === "string" ? v.trim() : v);
const texto = z.preprocess(vacioANull, z.string().max(2000).nullable());
const numero = z.preprocess((v) => (v === "" || v == null ? null : Number(String(v).replace(",", "."))), z.number().finite().min(0, "No puede ser negativo").nullable());
const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha no válida");
const id = z.guid();

// ---------- Vehículos y almacén ----------

const esquemaVehiculo = z.object({
  nombre: z.string().trim().min(1, "Pon un nombre (p. ej. Furgoneta 1)"),
  matricula: z.preprocess((v) => (typeof v === "string" ? v.replace(/[\s-]/g, "").toUpperCase() || null : null), z.string().max(15).nullable()),
  capacidad_kg: numero,
  capacidad_bultos: z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().int("Número entero").min(0).nullable()),
  etiqueta_ambiental: z.preprocess(vacioANull, z.enum(ETIQUETAS_AMBIENTALES).nullable()),
  conductor_habitual: z.preprocess(vacioANull, id.nullable()),
  activo: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
  notas: texto,
});

export async function guardarVehiculo(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  await exigirAdmin();
  const r = esquemaVehiculo.safeParse(Object.fromEntries(form));
  if (!r.success) return { error: r.error.issues[0].message };
  const vid = form.get("id") as string | null;
  const sb = await supabaseServidor();
  const { error } = vid ? await sb.from("vehiculos").update(r.data).eq("id", vid) : await sb.from("vehiculos").insert(r.data);
  if (error) return { error: error.message };
  refresh();
  return { ok: vid ? "Vehículo guardado." : "Vehículo añadido." };
}

const esquemaAlmacen = z.object({
  almacen_direccion: texto,
  almacen_lat: z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().min(-90).max(90).nullable()),
  almacen_lng: z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().min(-180).max(180).nullable()),
});

export async function guardarAlmacen(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  await exigirAdmin();
  const r = esquemaAlmacen.safeParse(Object.fromEntries(form));
  if (!r.success) return { error: "Ubicación no válida" };
  const sb = await supabaseServidor();
  const { error } = await sb.from("ajustes_logistica").update({ ...r.data, actualizado_at: new Date().toISOString() }).eq("id", true);
  if (error) return { error: error.message };
  refresh();
  return { ok: "Almacén guardado." };
}

// ---------- Rutas ----------

const esquemaRuta = z.object({
  fecha,
  conductor_id: id.or(z.literal("")).refine((v) => v !== "", "Elige quién conduce"),
  vehiculo_id: z.preprocess(vacioANull, id.nullable()),
  notas: texto,
});

export async function crearRuta(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  await exigirAdmin();
  const r = esquemaRuta.safeParse(Object.fromEntries(form));
  if (!r.success) return { error: r.error.issues[0].message };
  const sb = await supabaseServidor();
  const { data, error } = await sb.from("rutas").insert(r.data).select("id").single();
  if (error) return { error: error.message };
  redirect(`/logistica/rutas/${data.id}`);
}

export async function cambiarRuta(form: FormData) {
  await exigirAdmin();
  const r = z.object({ id, conductor_id: id, vehiculo_id: z.preprocess(vacioANull, id.nullable()), fecha, notas: texto }).safeParse(Object.fromEntries(form));
  if (!r.success) return;
  const { id: rid, ...datos } = r.data;
  const sb = await supabaseServidor();
  await sb.from("rutas").update(datos).eq("id", rid).eq("estado", "planificada");
  refresh();
}

export async function borrarRuta(form: FormData) {
  await exigirAdmin();
  const rid = id.parse(form.get("id"));
  const sb = await supabaseServidor();
  const { error } = await sb.from("rutas").delete().eq("id", rid);
  if (error) throw new Error(error.message);
  redirect("/logistica");
}

async function paradasDe(rutaId: string) {
  const sb = await supabaseServidor();
  const { data } = await sb.from("paradas").select("id, orden, estado").eq("ruta_id", rutaId).order("orden");
  return data ?? [];
}

/** Añade pedidos por repartir y/o clientes sueltos (p. ej. recoger envases) al final de la ruta. */
export async function anadirParadas(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  await exigirAdmin();
  const rutaId = id.parse(form.get("ruta_id"));
  const pedidos = form.getAll("pedido").map(String).filter((v) => id.safeParse(v).success);
  const clientes = form.getAll("cliente").map(String).filter((v) => id.safeParse(v).success);
  if (!pedidos.length && !clientes.length) return { error: "Marca al menos un pedido o un cliente." };
  const sb = await supabaseServidor();
  const { data: peds } = pedidos.length ? await sb.from("pedidos_por_repartir").select("id, cliente_id").in("id", pedidos) : { data: [] };
  let orden = (await paradasDe(rutaId)).reduce((m, p) => Math.max(m, p.orden), 0);
  const filas = [
    ...(peds ?? []).map((p) => ({ ruta_id: rutaId, cliente_id: p.cliente_id!, pedido_id: p.id!, orden: ++orden })),
    ...clientes.map((c) => ({ ruta_id: rutaId, cliente_id: c, orden: ++orden })),
  ];
  const { error } = await sb.from("paradas").insert(filas);
  if (error) return { error: /paradas_pedido_vivo/.test(error.message) ? "Algún pedido ya está en otra ruta." : error.message };
  refresh();
  return { ok: `${filas.length} parada${filas.length === 1 ? "" : "s"} añadida${filas.length === 1 ? "" : "s"}.` };
}

async function renumerar(lista: { id: string; orden: number }[]) {
  const sb = await supabaseServidor();
  // Dos pasadas para no chocar con el orden de otra parada mientras se mueven
  for (const p of lista) await sb.from("paradas").update({ orden: p.orden + 10_000 }).eq("id", p.id).eq("estado", "pendiente");
  for (const p of lista) await sb.from("paradas").update({ orden: p.orden }).eq("id", p.id).eq("estado", "pendiente");
}

export async function moverParadaAccion(form: FormData) {
  await exigirAdmin();
  const rutaId = id.parse(form.get("ruta_id"));
  const pid = id.parse(form.get("id"));
  const delta = form.get("delta") === "-1" ? -1 : 1;
  const actuales = await paradasDe(rutaId);
  if (actuales.some((p) => p.estado !== "pendiente")) return; // con entregas hechas ya no se reordena
  await renumerar(moverParada(actuales, pid, delta));
  refresh();
}

export async function quitarParada(form: FormData) {
  await exigirAdmin();
  const rutaId = id.parse(form.get("ruta_id"));
  const pid = id.parse(form.get("id"));
  const sb = await supabaseServidor();
  await sb.from("paradas").delete().eq("id", pid).eq("estado", "pendiente");
  const restantes = (await paradasDe(rutaId)).filter((p) => p.estado === "pendiente");
  if (restantes.length === (await paradasDe(rutaId)).length) await renumerar(restantes.map((p, i) => ({ id: p.id, orden: i + 1 })));
  refresh();
}

/** Orden por cercanía desde el almacén (vecino más próximo). Las paradas sin ubicación van al final. */
export async function ordenarPorCercania(form: FormData) {
  await exigirAdmin();
  const rutaId = id.parse(form.get("ruta_id"));
  const sb = await supabaseServidor();
  const [{ data: ps }, { data: aj }] = await Promise.all([
    sb.from("paradas").select("id, orden, estado, clientes(lat, lng)").eq("ruta_id", rutaId).order("orden"),
    sb.from("ajustes_logistica").select("almacen_lat, almacen_lng").single(),
  ]);
  if (!ps?.length || ps.some((p) => p.estado !== "pendiente")) return;
  const con = ps.filter((p) => p.clientes?.lat != null && p.clientes?.lng != null).map((p) => ({ id: p.id, lat: p.clientes!.lat!, lng: p.clientes!.lng! }));
  const sin = ps.filter((p) => p.clientes?.lat == null || p.clientes?.lng == null);
  const inicio = aj?.almacen_lat != null && aj?.almacen_lng != null ? { lat: aj.almacen_lat, lng: aj.almacen_lng } : null;
  const orden = [...ordenarRuta(con, inicio), ...sin];
  await renumerar(orden.map((p, i) => ({ id: p.id, orden: i + 1 })));
  refresh();
}

export async function guardarNotaParada(form: FormData) {
  await exigirAdmin();
  const r = z.object({ id, notas_oficina: texto }).safeParse(Object.fromEntries(form));
  if (!r.success) return;
  const sb = await supabaseServidor();
  await sb.from("paradas").update({ notas_oficina: r.data.notas_oficina }).eq("id", r.data.id).eq("estado", "pendiente");
  refresh();
}

export async function guardarEntregaCliente(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  await exigirAdmin();
  const r = z.object({ cliente_id: id, horario_entrega: texto, notas_acceso: texto }).safeParse(Object.fromEntries(form));
  if (!r.success) return { error: "Datos no válidos" };
  const sb = await supabaseServidor();
  const { error } = await sb.from("clientes_entrega").upsert({ ...r.data, actualizado_at: new Date().toISOString() });
  if (error) return { error: error.message };
  refresh();
  return { ok: "Guardado." };
}
