"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { exigirAdmin } from "@/lib/auth";
import { enviarAvisos } from "@/lib/avisos";
import { leerCoordenadas, leerLineasTexto } from "@/lib/dominio/destinos";
import { interpretarHorario } from "@/lib/dominio/horario";
import { guardarAlbaranes } from "@/lib/logistica/importar";
import { ubicarDireccion } from "@/lib/logistica/mapas";
import { calcularPlan, type PlanPropuesto } from "@/lib/logistica/planificar";
import { supabaseServidor } from "@/lib/supabase/servidor";

export interface EstadoForm {
  error?: string;
  ok?: string;
}

const vacioANull = (v: unknown) => (v == null || (typeof v === "string" && v.trim() === "") ? null : typeof v === "string" ? v.trim() : v);
const texto = z.preprocess(vacioANull, z.string().max(2000).nullable());
const id = z.guid();
const hora = z.preprocess(vacioANull, z.string().regex(/^\d{2}:\d{2}$/, "Hora no válida").nullable());

// ---------- Zonas y ajustes ----------

export async function guardarZona(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  await exigirAdmin();
  const r = z
    .object({
      nombre: z.string().trim().min(1, "Pon un nombre a la zona"),
      vehiculo_id: z.preprocess(vacioANull, id.nullable()),
      color: texto,
    })
    .safeParse(Object.fromEntries(form));
  if (!r.success) return { error: r.error.issues[0].message };
  const dias = form.getAll("dia").map(Number).filter((n) => n >= 1 && n <= 7);
  const zid = form.get("id") as string | null;
  const sb = await supabaseServidor();
  const datos = { ...r.data, dias };
  const { error } = zid ? await sb.from("zonas_reparto").update(datos).eq("id", zid) : await sb.from("zonas_reparto").insert(datos);
  if (error) return { error: error.message };
  refresh();
  return { ok: zid ? "Zona guardada." : "Zona añadida." };
}

export async function borrarZona(form: FormData) {
  await exigirAdmin();
  const sb = await supabaseServidor();
  await sb.from("zonas_reparto").update({ activa: false }).eq("id", id.parse(form.get("id")));
  refresh();
}

export async function guardarAjustesPlan(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  await exigirAdmin();
  const r = z
    .object({
      minutos_descarga: z.coerce.number().int().min(1, "Mínimo 1 minuto").max(120),
      hora_salida: z.string().regex(/^\d{2}:\d{2}$/, "Hora no válida"),
      volver_almacen: z.preprocess((v) => v === "on", z.boolean()),
    })
    .safeParse(Object.fromEntries(form));
  if (!r.success) return { error: r.error.issues[0].message };
  const sb = await supabaseServidor();
  const { error } = await sb.from("ajustes_logistica").update(r.data).eq("id", true);
  if (error) return { error: error.message };
  refresh();
  return { ok: "Ajustes guardados." };
}

// ---------- Albaranes ----------

/** Alta a mano (sin PDF): para un destino ya conocido o uno nuevo. */
export async function altaManual(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  await exigirAdmin();
  const r = z
    .object({
      destino_id: z.preprocess(vacioANull, id.nullable()),
      nombre: texto,
      direccion: texto,
      localidad: texto,
      codigo_postal: texto,
      telefono: texto,
      horario: texto,
      zona: texto,
      numero: texto,
      productos: texto,
      notas: texto,
    })
    .safeParse(Object.fromEntries(form));
  if (!r.success) return { error: r.error.issues[0].message };
  const d = r.data;
  const sb = await supabaseServidor();
  let base = { cliente: d.nombre ?? "", direccion: d.direccion, localidad: d.localidad, codigo_postal: d.codigo_postal, telefono: d.telefono };
  if (d.destino_id) {
    const { data: dest } = await sb.from("destinos").select("*").eq("id", d.destino_id).single();
    if (!dest) return { error: "Ese cliente ya no existe." };
    base = { cliente: dest.nombre, direccion: dest.direccion, localidad: dest.localidad, codigo_postal: dest.codigo_postal, telefono: dest.telefono };
  } else if (!d.nombre || (!d.direccion && !d.localidad)) {
    return { error: "Pon el nombre del cliente y la dirección de entrega." };
  }
  const { data: zona } = d.zona ? await sb.from("zonas_reparto").select("nombre").eq("id", d.zona).maybeSingle() : { data: null };
  const [res] = await guardarAlbaranes(
    sb,
    [{ ...base, numero: d.numero?.toUpperCase() ?? null, fecha: null, nif: null, lineas: d.productos ? leerLineasTexto(d.productos) : [], horario: d.horario, ruta: zona?.nombre ?? null, notas: d.notas }],
    "manual",
    null,
  );
  refresh();
  if (res.repetido) return { error: `El albarán ${res.numero} ya estaba importado.` };
  return { ok: `Entrega para ${res.cliente} añadida.${res.avisos.length ? " " + res.avisos.join(" ") : ""}` };
}

export async function anularAlbaran(form: FormData) {
  await exigirAdmin();
  const sb = await supabaseServidor();
  await sb.from("albaranes").update({ estado: "anulado" }).eq("id", id.parse(form.get("id"))).eq("estado", "pendiente");
  refresh();
}

type Sb = Awaited<ReturnType<typeof supabaseServidor>>;

/** Borra los PDF que ya no use ningún albarán (un PDF puede traer varios). */
async function borrarPdfsHuerfanos(sb: Sb, paths: (string | null)[]) {
  const unicos = [...new Set(paths.filter((x): x is string => !!x))];
  if (!unicos.length) return;
  const { data: siguen } = await sb.from("albaranes").select("archivo_path").in("archivo_path", unicos);
  const usados = new Set((siguen ?? []).map((a) => a.archivo_path));
  const sobran = unicos.filter((x) => !usados.has(x));
  if (sobran.length) await sb.storage.from("albaranes").remove(sobran);
}

/** Borra de verdad un albarán por repartir o ya en una ruta (sin entregar): sale de la ruta y se puede volver a subir. */
export async function borrarAlbaran(form: FormData) {
  await exigirAdmin();
  const aid = id.parse(form.get("id"));
  const sb = await supabaseServidor();
  const { data: a } = await sb.from("albaranes").select("id, estado, archivo_path").eq("id", aid).maybeSingle();
  if (!a || !["pendiente", "planificado", "anulado"].includes(a.estado)) return;
  const { error: e1 } = await sb.from("paradas").delete().eq("albaran_id", aid).eq("estado", "pendiente");
  if (e1) throw new Error(e1.message);
  const { error: e2 } = await sb.from("albaranes").delete().eq("id", aid);
  if (e2) throw new Error(e2.message);
  await borrarPdfsHuerfanos(sb, [a.archivo_path]);
  refresh();
}

/**
 * Empezar de cero (tras las pruebas): borra todos los albaranes, sus PDF, sus paradas (también las ya
 * entregadas) y las rutas que se queden vacías. No toca zonas, vehículos, almacén ni nada del CRM.
 */
export async function vaciarAlbaranes(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  await exigirAdmin();
  const conDirecciones = form.get("direcciones") === "on";
  const sb = await supabaseServidor();
  const { data, error } = await sb.rpc("vaciar_albaranes", { p_destinos: conDirecciones });
  if (error) return { error: `No se ha podido borrar todo: ${error.message}` };
  const r = data as { albaranes: number; rutas: number; archivos: string[]; pdfs: string[] };
  if (r.archivos.length) await sb.storage.from("entregas").remove(r.archivos);
  if (r.pdfs.length) await sb.storage.from("albaranes").remove(r.pdfs);
  // También los PDF subidos dos veces, que ya no usa ningún albarán
  for (let vuelta = 0; vuelta < 20; vuelta++) {
    const { data: sueltos } = await sb.storage.from("albaranes").list("", { limit: 100 });
    const nombres = (sueltos ?? []).filter((f) => f.id).map((f) => f.name);
    if (!nombres.length) break;
    await sb.storage.from("albaranes").remove(nombres);
  }
  refresh();
  return {
    ok: `Hecho: ${r.albaranes === 1 ? "1 albarán borrado" : `${r.albaranes} albaranes borrados`}${r.rutas ? ` y ${r.rutas === 1 ? "1 ruta" : `${r.rutas} rutas`}` : ""}${conDirecciones ? ", también las direcciones guardadas" : ""}. Todo listo para empezar.`,
  };
}

/** Corrige un destino: zona, horario, dirección (se vuelve a situar en el mapa), acceso y descarga. */
export async function editarDestino(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  await exigirAdmin();
  const r = z
    .object({
      id,
      direccion: texto,
      localidad: texto,
      codigo_postal: texto,
      zona_id: z.preprocess(vacioANull, id.nullable()),
      ventana_desde: hora,
      ventana_hasta: hora,
      horario_texto: texto,
      notas_acceso: texto,
      minutos_descarga: z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().int().min(1).max(120).nullable()),
      coordenadas: texto,
    })
    .safeParse(Object.fromEntries(form));
  if (!r.success) return { error: r.error.issues[0].message };
  const { id: did, coordenadas, ...datos } = r.data;
  const manual = coordenadas ? leerCoordenadas(coordenadas) : null;
  if (coordenadas && !manual) return { error: "No entiendo esas coordenadas. Pega un enlace de Google Maps o «39.47, -0.37»." };
  // Si escriben el horario en texto y no las horas, se interpreta
  if (!datos.ventana_desde && !datos.ventana_hasta && datos.horario_texto) {
    const f = interpretarHorario(datos.horario_texto);
    if (!f) return { error: `No entiendo el horario «${datos.horario_texto}». Pon las horas (desde / hasta).` };
    datos.ventana_desde = f.desde;
    datos.ventana_hasta = f.hasta;
  }
  if (datos.ventana_desde && datos.ventana_hasta && datos.ventana_desde >= datos.ventana_hasta) return { error: "La hora «desde» tiene que ser anterior a «hasta»." };
  const sb = await supabaseServidor();
  const { data: antes } = await sb.from("destinos").select("direccion, localidad, codigo_postal, lat").eq("id", did).single();
  const cambiaDireccion = antes && (antes.direccion !== datos.direccion || antes.localidad !== datos.localidad || antes.codigo_postal !== datos.codigo_postal);
  let ubicacion = {};
  let nota = "";
  if (manual) {
    ubicacion = { lat: manual.lat, lng: manual.lng, ubicacion_origen: "manual" };
    nota = " Ubicación fijada a mano.";
  } else if (cambiaDireccion || antes?.lat == null) {
    const p = await ubicarDireccion(datos);
    if (p) {
      ubicacion = { lat: p.lat, lng: p.lng, ubicacion_origen: "direccion" };
      nota = " Encontrada en el mapa.";
    } else nota = " No la encontramos en el mapa: pega abajo un enlace de Google Maps del sitio.";
  }
  const { error } = await sb.from("destinos").update({ ...datos, ...ubicacion, actualizado_at: new Date().toISOString() }).eq("id", did);
  if (error) return { error: error.message };
  refresh();
  return { ok: "Guardado." + nota };
}

/** Asigna zona a uno o varios clientes de reparto (vale para todos sus albaranes, también los futuros). */
export async function asignarZona(form: FormData) {
  await exigirAdmin();
  const ids = form.getAll("destino_id").map(String).filter((v) => id.safeParse(v).success);
  const zona = String(form.get("zona_id") ?? "");
  if (!ids.length) return;
  const sb = await supabaseServidor();
  await sb.from("destinos").update({ zona_id: id.safeParse(zona).success ? zona : null, actualizado_at: new Date().toISOString() }).in("id", ids);
  refresh();
}

/** Vuelve a buscar en el mapa los clientes con albaranes pendientes que aún no tienen ubicación. */
export async function reubicarPendientes(): Promise<EstadoForm> {
  await exigirAdmin();
  const sb = await supabaseServidor();
  const { data } = await sb.from("albaranes").select("destinos(id, direccion, codigo_postal, localidad, lat)").eq("estado", "pendiente");
  const sinUbicar = [...new Map((data ?? []).map((a) => a.destinos).filter((d) => d && d.lat == null).map((d) => [d!.id, d!])).values()];
  let encontrados = 0;
  for (const d of sinUbicar) {
    const p = await ubicarDireccion(d);
    if (p) {
      await sb.from("destinos").update({ lat: p.lat, lng: p.lng, ubicacion_origen: "direccion" }).eq("id", d.id);
      encontrados++;
    }
  }
  refresh();
  if (!sinUbicar.length) return { ok: "Todos tienen ubicación." };
  const faltan = sinUbicar.length - encontrados;
  return faltan
    ? { ok: `Encontrados ${encontrados} de ${sinUbicar.length}. A los ${faltan} que faltan, pulsa el lápiz y pega un enlace de Google Maps del sitio.` }
    : { ok: `Encontrados los ${encontrados}.` };
}

// ---------- Planificar ----------

export async function calcularPlanAccion(fecha: string, albaranIds: string[], vehiculoIds: string[]): Promise<{ plan?: PlanPropuesto; error?: string }> {
  await exigirAdmin();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { error: "Fecha no válida" };
  const ids = z.array(id).safeParse(albaranIds);
  const vs = z.array(id).safeParse(vehiculoIds);
  if (!ids.success || !vs.success) return { error: "Selección no válida" };
  try {
    return { plan: await calcularPlan(await supabaseServidor(), fecha, ids.data, vs.data) };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se ha podido calcular la ruta" };
  }
}

/** Crea las rutas del plan aceptado: una por vehículo, con sus paradas en orden y la hora prevista. */
export async function aceptarPlan(plan: PlanPropuesto, conductores: Record<string, string>): Promise<{ error?: string }> {
  await exigirAdmin();
  const sb = await supabaseServidor();
  for (const r of plan.rutas) {
    if (!id.safeParse(conductores[r.vehiculoId]).success) return { error: `Elige quién conduce ${r.vehiculo}.` };
  }
  const creadas: string[] = [];
  for (const r of plan.rutas) {
    const { data: ruta, error } = await sb
      .from("rutas")
      .insert({ fecha: plan.fecha, vehiculo_id: r.vehiculoId, conductor_id: conductores[r.vehiculoId], notas: `Ruta calculada: ${r.km.toLocaleString("es-ES")} km, ${Math.floor(r.duracionMin / 60)} h ${r.duracionMin % 60} min. Salida ${r.salida}.` })
      .select("id")
      .single();
    if (error) return { error: error.message };
    creadas.push(ruta.id);
    let orden = 0;
    const filas = r.paradas.flatMap((p) => p.albaranIds.map((albaran_id) => ({ ruta_id: ruta.id, orden: ++orden, destino_id: p.destinoId, albaran_id, llegada_prevista: p.llegada })));
    const { error: e2 } = await sb.from("paradas").insert(filas);
    if (e2) {
      // Sin rutas a medias: si algo falla (p. ej. otro usuario ya planificó un albarán), se deshace
      await sb.from("rutas").delete().in("id", creadas);
      return { error: /paradas_albaran_vivo/.test(e2.message) ? "Algún albarán ya se ha planificado mientras tanto. Vuelve a calcular." : e2.message };
    }
  }
  // Aviso al móvil de cada conductor, sin hacer esperar a la oficina
  after(async () => {
    const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());
    const cuando = plan.fecha === hoy ? "de hoy" : `del ${new Date(plan.fecha + "T12:00:00").toLocaleDateString("es-ES", { weekday: "long", day: "numeric" })}`;
    for (const r of plan.rutas) {
      const n = r.paradas.length;
      await enviarAvisos([conductores[r.vehiculoId]], { titulo: `🚚 Ya tienes tu ruta ${cuando}`, cuerpo: `${r.vehiculo}: ${n === 1 ? "1 parada" : `${n} paradas`}, salida ${r.salida}.`, url: "/reparto", etiqueta: `ruta-${plan.fecha}` }).catch(() => 0);
    }
  });
  redirect(`/logistica?fecha=${plan.fecha}`);
}
