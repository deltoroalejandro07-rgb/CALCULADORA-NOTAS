import type { SupabaseClient } from "@supabase/supabase-js";
import { siguienteEstado } from "../dominio/estado";
import type { Database } from "../supabase/tipos-bd";
import type { BaseLocal, ClienteNuevo, Operacion, VisitaNueva } from "./db";

type Cliente = SupabaseClient<Database>;

export const BUCKET_FOTOS = "visitas";

/** Guarda una visita (y el cliente nuevo, si lo hay) en la cola local. Nunca falla por falta de red. */
export async function encolarVisita(
  db: BaseLocal,
  visita: VisitaNueva,
  fotos: { id: string; blob: Blob }[],
  clienteNuevo?: ClienteNuevo,
) {
  const ahora = Date.now();
  await db.transaction("rw", [db.cola, db.fotos, db.clientes], async () => {
    if (clienteNuevo) {
      await db.cola.put({ id: clienteNuevo.id, tipo: "cliente", datos: clienteNuevo, creada_at: ahora, intentos: 0 });
      await db.clientes.put({
        ...clienteNuevo,
        zona: null,
        direccion: null,
        estado: "prospecto",
        consiente_whatsapp: false,
        consiente_email: false,
        ultima_visita_at: null,
        is_seed: false,
        pendiente: true,
      });
    }
    await db.cola.put({ id: visita.id, tipo: "visita", datos: visita, creada_at: ahora + 1, intentos: 0 });
    for (const f of fotos) await db.fotos.put({ id: f.id, visita_id: visita.id, cliente_id: visita.cliente_id, blob: f.blob });

    // Reflejo inmediato en la copia local (lo definitivo lo calcula la base de datos)
    const c = await db.clientes.get(visita.cliente_id);
    if (c) {
      await db.clientes.update(c.id, {
        estado: siguienteEstado(c.estado, visita.resultado),
        ultima_visita_at: visita.fecha,
        consiente_whatsapp: c.consiente_whatsapp || visita.consentimientos.some((x) => x.canal === "whatsapp"),
        consiente_email: c.consiente_email || visita.consentimientos.some((x) => x.canal === "email"),
      });
    }
  });
}

interface ErrorLike {
  code?: string;
  message?: string;
  statusCode?: string | number;
}

/**
 * ¿Merece la pena reintentar? Sin red, cortes, errores 5xx o de sesión: sí.
 * Un error de datos o permisos (SQLSTATE 22xxx, 23xxx, 42xxx, P0001…) no se arregla reintentando.
 */
export function esErrorTemporal(e: ErrorLike): boolean {
  const msg = e.message ?? "";
  if (/fetch|network|load failed|timeout|abort|jwt|token|session/i.test(msg)) return true;
  const status = Number(e.statusCode);
  if (status && (status >= 500 || status === 401 || status === 408 || status === 429)) return true;
  const code = e.code ?? "";
  if (!code) return true;
  if (/^PGRST3/.test(code)) return true; // autenticación de PostgREST
  return /^(08|40|53|57)/.test(code); // conexión, concurrencia, recursos, cancelación
}

class ErrorSubida extends Error {
  constructor(public original: ErrorLike) {
    super(original.message ?? "Error desconocido");
  }
}

function comprobar(r: { error: ErrorLike | null }) {
  if (r.error) throw new ErrorSubida(r.error);
}

async function subirCliente(sb: Cliente, c: ClienteNuevo, comercialId: string) {
  comprobar(
    await sb.from("clientes").upsert({ ...c, comercial_id: comercialId }, { onConflict: "id", ignoreDuplicates: true }),
  );
}

async function subirVisita(sb: Cliente, db: BaseLocal, v: VisitaNueva) {
  const { productos, fotos, consentimientos, ...fila } = v;

  comprobar(await sb.from("visitas").upsert(fila, { onConflict: "id", ignoreDuplicates: true }));

  if (productos.length) {
    comprobar(
      await sb
        .from("visita_productos")
        .upsert(productos.map((p) => ({ visita_id: v.id, ...p })), { onConflict: "visita_id,producto_id,relacion", ignoreDuplicates: true }),
    );
  }

  if (consentimientos.length) {
    comprobar(
      await sb.from("consentimientos").upsert(
        consentimientos.map((c) => ({
          id: c.id,
          cliente_id: v.cliente_id,
          canal: c.canal,
          otorgado: true,
          origen: "verbal_visita" as const,
          evidencia: "Marcado por el comercial al registrar la visita",
        })),
        { onConflict: "id", ignoreDuplicates: true },
      ),
    );
  }

  for (const f of fotos) {
    const pendiente = await db.fotos.get(f.id);
    const ruta = `${v.cliente_id}/${v.id}/${f.id}.jpg`;
    if (pendiente) {
      const { error } = await sb.storage.from(BUCKET_FOTOS).upload(ruta, pendiente.blob, { contentType: "image/jpeg" });
      // Ya subida en un intento anterior: vale
      if (error && !/exists|duplicate/i.test(error.message)) throw new ErrorSubida(error as ErrorLike);
    }
    comprobar(
      await sb
        .from("visita_fotos")
        .upsert({ id: f.id, visita_id: v.id, storage_path: ruta, tipo: f.tipo }, { onConflict: "id", ignoreDuplicates: true }),
    );
    await db.fotos.delete(f.id);
  }
}

export interface ResultadoSincronizacion {
  subidas: number;
  pendientes: number;
  conError: number;
  sinConexion: boolean;
}

let enCurso: Promise<ResultadoSincronizacion> | null = null;

/**
 * Sube la cola en orden (los clientes nuevos antes que sus visitas). Todo es
 * idempotente: los IDs se generan en el móvil y un reintento no duplica nada.
 */
export function sincronizar(sb: Cliente, db: BaseLocal, comercialId: string): Promise<ResultadoSincronizacion> {
  enCurso ??= ejecutar(sb, db, comercialId).finally(() => {
    enCurso = null;
  });
  return enCurso;
}

async function ejecutar(sb: Cliente, db: BaseLocal, comercialId: string): Promise<ResultadoSincronizacion> {
  let subidas = 0;
  let sinConexion = false;
  const fallidos = new Set<string>();
  const ops: Operacion[] = await db.cola.orderBy("creada_at").toArray();

  for (const op of ops) {
    if (op.error) {
      fallidos.add(op.id);
      continue;
    }
    // Si su cliente nuevo no pudo subirse, la visita tampoco puede
    if (op.tipo === "visita" && fallidos.has(op.datos.cliente_id)) continue;

    try {
      if (op.tipo === "cliente") await subirCliente(sb, op.datos, comercialId);
      else await subirVisita(sb, db, op.datos);
      await db.cola.delete(op.id);
      if (op.tipo === "cliente") await db.clientes.update(op.id, { pendiente: false });
      subidas++;
    } catch (e) {
      const original: ErrorLike = e instanceof ErrorSubida ? e.original : { message: String(e) };
      if (esErrorTemporal(original)) {
        await db.cola.update(op.id, { intentos: op.intentos + 1 });
        sinConexion = true;
        break; // sin red no tiene sentido seguir
      }
      await db.cola.update(op.id, { intentos: op.intentos + 1, error: original.message ?? "Error" });
      fallidos.add(op.id);
    }
  }

  const restantes = await db.cola.toArray();
  return {
    subidas,
    pendientes: restantes.length,
    conError: restantes.filter((o) => o.error).length,
    sinConexion,
  };
}

/** Refresca la copia local de clientes y productos. Conserva los creados en el móvil que aún no han subido. */
export async function refrescarCopiaLocal(sb: Cliente, db: BaseLocal) {
  const [clientes, productos] = await Promise.all([
    sb
      .from("clientes")
      .select("id, nombre_negocio, tipo, zona, direccion, contacto_nombre, telefono, lat, lng, estado, consiente_whatsapp, consiente_email, ultima_visita_at, is_seed")
      .order("nombre_negocio"),
    sb.from("productos").select("id, nombre, categoria, formato, destacado").eq("activo", true).order("nombre"),
  ]);
  if (clientes.error || productos.error) throw new ErrorSubida((clientes.error ?? productos.error)!);

  await db.transaction("rw", [db.clientes, db.productos, db.cola], async () => {
    const pendientes = await db.clientes.filter((c) => !!c.pendiente).toArray();
    await db.clientes.clear();
    await db.clientes.bulkPut(clientes.data);
    await db.clientes.bulkPut(pendientes);
    await db.productos.clear();
    await db.productos.bulkPut(productos.data);
  });
}
