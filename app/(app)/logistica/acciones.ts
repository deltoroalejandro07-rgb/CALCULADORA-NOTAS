"use server";

import { actualizarPantallas } from "@/lib/actualizar";
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

/** Errores de Supabase en lenguaje claro. Sin la migración de logística, las tablas no existen. */
function mensajeError(e: { message: string }): string {
  if (/schema cache|does not exist|Could not find the (table|function)/i.test(e.message)) {
    return "Falta actualizar la base de datos: ejecuta en Supabase la migración de logística (docs/GUIA-CUENTAS.md, paso 2).";
  }
  return e.message;
}

/** Busca la dirección en OpenStreetMap (gratis). Sin resultado o sin red: null. */
async function buscarCoordenadas(direccion: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const q = new URLSearchParams({ q: direccion, format: "json", limit: "1", countrycodes: "es" });
    const r = await fetch(`https://nominatim.openstreetmap.org/search?${q}`, {
      headers: { "User-Agent": "crm-dliverygo/1.0 (+https://crm-comercial-mu.vercel.app)", "Accept-Language": "es" },
      signal: AbortSignal.timeout(6000),
    });
    if (!r.ok) return null;
    const [primero] = (await r.json()) as { lat: string; lon: string }[];
    return primero ? { lat: Number(primero.lat), lng: Number(primero.lon) } : null;
  } catch {
    return null;
  }
}

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
  if (error) return { error: mensajeError(error) };
  actualizarPantallas();
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
  const datos = { ...r.data };
  let nota = "";
  // Sin GPS (p. ej. desde el ordenador): se busca la dirección escrita en el mapa
  if (datos.almacen_lat == null && datos.almacen_direccion) {
    const c = await buscarCoordenadas(datos.almacen_direccion);
    if (c) {
      datos.almacen_lat = c.lat;
      datos.almacen_lng = c.lng;
      nota = " Ubicación encontrada en el mapa por la dirección.";
    } else {
      nota = " No hemos encontrado la dirección en el mapa: revísala o usa tu ubicación estando en el almacén.";
    }
  }
  const sb = await supabaseServidor();
  const { error } = await sb.from("ajustes_logistica").update({ ...datos, actualizado_at: new Date().toISOString() }).eq("id", true);
  if (error) return { error: mensajeError(error) };
  actualizarPantallas();
  return { ok: "Almacén guardado." + nota };
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
  if (error) return { error: mensajeError(error) };
  redirect(`/logistica/rutas/${data.id}`);
}

export async function cambiarRuta(form: FormData) {
  await exigirAdmin();
  const r = z.object({ id, conductor_id: id, vehiculo_id: z.preprocess(vacioANull, id.nullable()), fecha, notas: texto }).safeParse(Object.fromEntries(form));
  if (!r.success) return;
  const { id: rid, ...datos } = r.data;
  const sb = await supabaseServidor();
  await sb.from("rutas").update(datos).eq("id", rid).eq("estado", "planificada");
  actualizarPantallas();
}

export async function borrarRuta(form: FormData) {
  await exigirAdmin();
  const rid = id.parse(form.get("id"));
  const sb = await supabaseServidor();
  const { data: archivos, error } = await sb.rpc("borrar_ruta_completa", { p_ruta: rid });
  if (error) throw new Error(error.message);
  if (archivos?.length) await sb.storage.from("entregas").remove(archivos);
  redirect("/logistica");
}

/** Deshace todas las rutas de un día: los albaranes vuelven a «por repartir» para recalcular. */
export async function deshacerRepartoDia(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  await exigirAdmin();
  const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(form.get("fecha"));
  const sb = await supabaseServidor();
  const { data: rutas } = await sb.from("rutas").select("id").eq("fecha", fecha);
  for (const r of rutas ?? []) {
    const { data: archivos, error } = await sb.rpc("borrar_ruta_completa", { p_ruta: r.id });
    if (error) return { error: `No se ha podido deshacer: ${error.message}` };
    if (archivos?.length) await sb.storage.from("entregas").remove(archivos);
  }
  actualizarPantallas();
  const n = rutas?.length ?? 0;
  return { ok: n ? `${n === 1 ? "Ruta borrada" : `${n} rutas borradas`}. Los albaranes vuelven a estar por repartir: ya puedes calcular de nuevo.` : "Ese día no tenía rutas." };
}

/**
 * Borra una ruta aunque ya tenga entregas (p. ej. una ruta de prueba), desde Mi reparto → Días.
 * Sus albaranes vuelven a «por repartir» (de ahí se pueden borrar si eran de prueba).
 */
export async function borrarRutaCompleta(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  await exigirAdmin();
  const rid = id.parse(form.get("id"));
  const sb = await supabaseServidor();
  const { data: archivos, error } = await sb.rpc("borrar_ruta_completa", { p_ruta: rid });
  if (error) return { error: `No se ha podido borrar: ${error.message}` };
  if (archivos?.length) await sb.storage.from("entregas").remove(archivos);
  actualizarPantallas();
  return { ok: "Ruta borrada." };
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
  const albaranes = form.getAll("albaran").map(String).filter((v) => id.safeParse(v).success);
  const clientes = form.getAll("cliente").map(String).filter((v) => id.safeParse(v).success);
  if (!albaranes.length && !clientes.length) return { error: "Marca al menos un albarán o un cliente." };
  const sb = await supabaseServidor();
  const { data: albs } = albaranes.length ? await sb.from("albaranes").select("id, destino_id").in("id", albaranes).eq("estado", "pendiente") : { data: [] };
  let orden = (await paradasDe(rutaId)).reduce((m, p) => Math.max(m, p.orden), 0);
  const filas = [
    ...(albs ?? []).map((a) => ({ ruta_id: rutaId, destino_id: a.destino_id, albaran_id: a.id, orden: ++orden })),
    ...clientes.map((c) => ({ ruta_id: rutaId, cliente_id: c, orden: ++orden })),
  ];
  if (!filas.length) return { error: "Esos albaranes ya están en otra ruta." };
  const { error } = await sb.from("paradas").insert(filas);
  if (error) return { error: /paradas_albaran_vivo|paradas_pedido_vivo/.test(error.message) ? "Algún albarán ya está en otra ruta." : mensajeError(error) };
  actualizarPantallas();
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
  actualizarPantallas();
}

export async function quitarParada(form: FormData) {
  await exigirAdmin();
  const rutaId = id.parse(form.get("ruta_id"));
  const pid = id.parse(form.get("id"));
  const sb = await supabaseServidor();
  await sb.from("paradas").delete().eq("id", pid).eq("estado", "pendiente");
  const restantes = (await paradasDe(rutaId)).filter((p) => p.estado === "pendiente");
  if (restantes.length === (await paradasDe(rutaId)).length) await renumerar(restantes.map((p, i) => ({ id: p.id, orden: i + 1 })));
  actualizarPantallas();
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
  actualizarPantallas();
}

export async function guardarNotaParada(form: FormData) {
  await exigirAdmin();
  const r = z.object({ id, notas_oficina: texto }).safeParse(Object.fromEntries(form));
  if (!r.success) return;
  const sb = await supabaseServidor();
  await sb.from("paradas").update({ notas_oficina: r.data.notas_oficina }).eq("id", r.data.id).eq("estado", "pendiente");
  actualizarPantallas();
}

export async function guardarEntregaCliente(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  await exigirAdmin();
  const r = z.object({ cliente_id: id, horario_entrega: texto, notas_acceso: texto }).safeParse(Object.fromEntries(form));
  if (!r.success) return { error: "Datos no válidos" };
  const sb = await supabaseServidor();
  const { error } = await sb.from("clientes_entrega").upsert({ ...r.data, actualizado_at: new Date().toISOString() });
  if (error) return { error: mensajeError(error) };
  actualizarPantallas();
  return { ok: "Guardado." };
}
