import type { SupabaseClient } from "@supabase/supabase-js";
import Dexie, { type EntityTable } from "dexie";
import type { LineaEntrega, RutaReparto } from "../dominio/reparto";
import type { Database } from "../supabase/tipos-bd";
import { esErrorTemporal } from "./sincronizar";

// Base local del reparto, separada de la de visitas ("crm-horeca"): así lo que ya
// existía no cambia. Cada registro lleva el usuario: si otro entra en el mismo
// móvil no ve nada ajeno, y lo pendiente del anterior se sube cuando vuelva a entrar.

type Cliente = SupabaseClient<Database>;

export const BUCKET_ENTREGAS = "entregas";

export interface RutaLocal {
  id: string;
  usuario_id: string;
  fecha: string;
  datos: RutaReparto;
  descargada_at: number;
}

export type EstadoSubida = "pendiente" | "subida" | "conflicto" | "error";

export interface EntregaLocal {
  /** entrega_id: lo genera el móvil y hace que reintentar no duplique. */
  id: string;
  parada_id: string;
  ruta_id: string;
  usuario_id: string;
  estado: "entregada" | "fallida";
  datos: {
    realizada_at: string;
    firmante: string | null;
    lineas: LineaEntrega[];
    envases_entregados: number;
    envases_recogidos: number;
    cobrado: number | null;
    forma_cobro: string | null;
    motivo_fallo: string | null;
    observaciones: string | null;
    lat: number | null;
    lng: number | null;
    precision_m: number | null;
  };
  /** Rutas en el almacén de ficheros (se rellenan al guardar, antes de subir). */
  firma_path: string | null;
  fotos: string[];
  subida: EstadoSubida;
  creada_at: number;
  intentos: number;
  error?: string;
}

export interface ArchivoEntrega {
  /** Ruta en el almacén: <parada_id>/<fichero> */
  path: string;
  entrega_id: string;
  blob: Blob;
  tipo: string;
}

export class BaseReparto extends Dexie {
  rutas!: EntityTable<RutaLocal, "id">;
  entregas!: EntityTable<EntregaLocal, "id">;
  archivos!: EntityTable<ArchivoEntrega, "path">;

  constructor(nombre = "crm-reparto") {
    super(nombre);
    this.version(1).stores({
      rutas: "id, usuario_id, fecha",
      entregas: "id, parada_id, usuario_id, subida, creada_at",
      archivos: "path, entrega_id",
    });
  }
}

let instancia: BaseReparto | null = null;

export function baseReparto(): BaseReparto {
  instancia ??= new BaseReparto();
  return instancia;
}

/** Guarda las rutas descargadas. Las que ya no vienen (terminadas hace días) se borran. */
export async function guardarRutas(db: BaseReparto, usuarioId: string, rutas: RutaReparto[]) {
  await db.transaction("rw", db.rutas, async () => {
    const ids = new Set(rutas.map((r) => r.id));
    const viejas = await db.rutas.where("usuario_id").equals(usuarioId).toArray();
    await db.rutas.bulkDelete(viejas.filter((r) => !ids.has(r.id)).map((r) => r.id));
    await db.rutas.bulkPut(rutas.map((r) => ({ id: r.id, usuario_id: usuarioId, fecha: r.fecha, datos: r, descargada_at: Date.now() })));
  });
}

export async function leerRutas(db: BaseReparto, usuarioId: string): Promise<RutaReparto[]> {
  const rutas = await db.rutas.where("usuario_id").equals(usuarioId).toArray();
  return rutas.map((r) => r.datos).sort((a, b) => a.fecha.localeCompare(b.fecha));
}

/** Descarga las rutas del conductor (de ayer a mañana) y las deja en el móvil. */
export async function descargarRutas(sb: Cliente, db: BaseReparto, usuarioId: string): Promise<RutaReparto[]> {
  const { data, error } = await sb.rpc("mi_reparto");
  if (error) throw error;
  const rutas = (data ?? []) as unknown as RutaReparto[];
  await guardarRutas(db, usuarioId, rutas);
  return rutas;
}

/**
 * Guarda la entrega en el móvil (firma y fotos incluidas) en una sola transacción.
 * A partir de aquí ya no se puede perder: se sube cuando haya cobertura.
 */
export async function guardarEntrega(
  db: BaseReparto,
  entrega: Omit<EntregaLocal, "firma_path" | "fotos" | "subida" | "creada_at" | "intentos">,
  firma: Blob | null,
  fotos: Blob[],
) {
  const firmaPath = firma ? `${entrega.parada_id}/firma-${entrega.id}.png` : null;
  const fotoPaths = fotos.map((_, i) => `${entrega.parada_id}/foto-${entrega.id}-${i + 1}.jpg`);
  await db.transaction("rw", [db.entregas, db.archivos], async () => {
    if (await db.entregas.get(entrega.id)) return; // doble toque: ya guardada
    await db.entregas.put({ ...entrega, firma_path: firmaPath, fotos: fotoPaths, subida: "pendiente", creada_at: Date.now(), intentos: 0 });
    if (firma && firmaPath) await db.archivos.put({ path: firmaPath, entrega_id: entrega.id, blob: firma, tipo: "image/png" });
    for (let i = 0; i < fotos.length; i++) await db.archivos.put({ path: fotoPaths[i], entrega_id: entrega.id, blob: fotos[i], tipo: "image/jpeg" });
  });
}

interface ErrorLike {
  code?: string;
  message?: string;
  statusCode?: string | number;
}

class ErrorSubida extends Error {
  constructor(public original: ErrorLike) {
    super(original.message ?? "Error desconocido");
  }
}

async function subirEntrega(sb: Cliente, db: BaseReparto, e: EntregaLocal): Promise<"registrada" | "ya_registrada" | "conflicto"> {
  // 1. Ficheros primero: si se corta a medias, el reintento los vuelve a intentar
  const archivos = await db.archivos.where("entrega_id").equals(e.id).toArray();
  for (const a of archivos) {
    const { error } = await sb.storage.from(BUCKET_ENTREGAS).upload(a.path, a.blob, { contentType: a.tipo, upsert: false });
    if (error && !/exists|duplicate/i.test(error.message)) throw new ErrorSubida(error as ErrorLike);
  }
  // 2. La entrega. Si ya estaba (reintento), la base de datos lo reconoce y no duplica
  const { data, error } = await sb.rpc("registrar_entrega", {
    p_parada: e.parada_id,
    p_entrega: e.id,
    p_estado: e.estado,
    p_datos: { ...e.datos, firma_path: e.firma_path, fotos: e.fotos } as unknown as Database["public"]["Functions"]["registrar_entrega"]["Args"]["p_datos"],
  });
  if (error) throw new ErrorSubida(error);
  return data as "registrada" | "ya_registrada" | "conflicto";
}

export interface ResultadoReparto {
  subidas: number;
  pendientes: number;
  conflictos: number;
  conError: number;
  sinConexion: boolean;
}

const enCurso = new Map<string, Promise<ResultadoReparto>>();

/** Sube las entregas pendientes del usuario, en el orden en que se hicieron. */
export function sincronizarReparto(sb: Cliente, db: BaseReparto, usuarioId: string): Promise<ResultadoReparto> {
  let p = enCurso.get(usuarioId);
  if (!p) {
    p = ejecutar(sb, db, usuarioId).finally(() => enCurso.delete(usuarioId));
    enCurso.set(usuarioId, p);
  }
  return p;
}

async function ejecutar(sb: Cliente, db: BaseReparto, usuarioId: string): Promise<ResultadoReparto> {
  let subidas = 0;
  let sinConexion = false;
  const pendientes = (await db.entregas.where("usuario_id").equals(usuarioId).toArray())
    .filter((e) => e.subida === "pendiente")
    .sort((a, b) => a.creada_at - b.creada_at);

  for (const e of pendientes) {
    try {
      const r = await subirEntrega(sb, db, e);
      if (r === "conflicto") {
        // Otra entrega distinta ya estaba registrada: no se pisa ni se borra nada del móvil
        await db.entregas.update(e.id, { subida: "conflicto", intentos: e.intentos + 1 });
        continue;
      }
      // Solo ahora, con el servidor confirmando, se liberan la firma y las fotos del móvil
      await db.transaction("rw", [db.entregas, db.archivos], async () => {
        await db.entregas.update(e.id, { subida: "subida", intentos: e.intentos + 1, error: undefined });
        await db.archivos.where("entrega_id").equals(e.id).delete();
      });
      subidas++;
    } catch (err) {
      const original: ErrorLike = err instanceof ErrorSubida ? err.original : { message: String(err) };
      if (esErrorTemporal(original)) {
        await db.entregas.update(e.id, { intentos: e.intentos + 1 });
        sinConexion = true;
        break;
      }
      await db.entregas.update(e.id, { subida: "error", intentos: e.intentos + 1, error: original.message ?? "Error" });
    }
  }

  const todas = await db.entregas.where("usuario_id").equals(usuarioId).toArray();
  return {
    subidas,
    pendientes: todas.filter((e) => e.subida === "pendiente").length,
    conflictos: todas.filter((e) => e.subida === "conflicto").length,
    conError: todas.filter((e) => e.subida === "error").length,
    sinConexion,
  };
}

/** Vuelve a intentar las que dieron error (p. ej. tras arreglar un permiso en la oficina). */
export async function reintentarErrores(db: BaseReparto, usuarioId: string) {
  const conError = (await db.entregas.where("usuario_id").equals(usuarioId).toArray()).filter((e) => e.subida === "error");
  await Promise.all(conError.map((e) => db.entregas.update(e.id, { subida: "pendiente", error: undefined })));
}

/** Entregas subidas hace más de 3 días: ya están en el servidor, se limpian del móvil. */
export async function limpiarAntiguas(db: BaseReparto, usuarioId: string) {
  const limite = Date.now() - 3 * 86_400_000;
  const viejas = (await db.entregas.where("usuario_id").equals(usuarioId).toArray()).filter((e) => e.subida === "subida" && e.creada_at < limite);
  await db.entregas.bulkDelete(viejas.map((e) => e.id));
}
