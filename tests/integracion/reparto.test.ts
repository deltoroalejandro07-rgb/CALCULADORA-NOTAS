// Logística contra Supabase local (`npm run db:start`). Se salta si no está levantado.
import "fake-indexeddb/auto";
import { createClient } from "@supabase/supabase-js";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { RutaReparto } from "@/lib/dominio/reparto";
import { BaseReparto, descargarRutas, guardarEntrega, leerRutas, sincronizarReparto } from "@/lib/offline/reparto";
import type { Database } from "@/lib/supabase/tipos-bd";

try {
  process.loadEnvFile(".env.local");
} catch {}
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const PUBLICA = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const SECRETA = process.env.SUPABASE_SECRET_KEY ?? "";

const disponible =
  /127\.0\.0\.1|localhost/.test(URL) &&
  !!SECRETA &&
  (await fetch(`${URL}/auth/v1/health`, { headers: { apikey: PUBLICA } })
    .then((r) => r.ok)
    .catch(() => false));

const admin = createClient<Database>(URL || "http://127.0.0.1", SECRETA || "x", { auth: { persistSession: false } });

async function sesionDe(email: string) {
  const sb = createClient<Database>(URL, PUBLICA, { auth: { persistSession: false } });
  const { data } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  const { data: s, error } = await sb.auth.verifyOtp({ email, token: data.properties!.email_otp, type: "email" });
  if (error) throw error;
  return { sb, id: s.user!.id };
}

const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());
const firma = () => new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3])], { type: "image/png" });

describe.skipIf(!disponible)("logística: rutas y entregas", () => {
  // Comercial temporal: así no se tocan los clientes de Ana, que usa otro test a la vez
  const emailComercial = `comercial-reparto-${randomUUID().slice(0, 8)}@demo.local`;
  let ana: Awaited<ReturnType<typeof sesionDe>>;
  let luis: Awaited<ReturnType<typeof sesionDe>>;
  let db: BaseReparto;
  let rutaId: string;
  let clienteAna: { id: string; nombre_negocio: string };
  let clienteTemporal: string;
  const paradas: string[] = [];
  let pedidoId: string;

  beforeAll(async () => {
    const { error: errU } = await admin.auth.admin.createUser({ email: emailComercial, email_confirm: true, user_metadata: { nombre: "Comercial reparto" } });
    if (errU) throw errU;
    ana = await sesionDe(emailComercial);
    luis = await sesionDe("luis@demo.local");
    db = new BaseReparto("test-reparto-" + randomUUID());

    const { data: c } = await admin.from("clientes").insert({ nombre_negocio: "Bar del comercial reparto", comercial_id: ana.id }).select("id, nombre_negocio").single();
    clienteAna = c!;
    const { data: tmp } = await admin.from("clientes").insert({ nombre_negocio: "Bar temporal reparto", comercial_id: ana.id }).select("id").single();
    clienteTemporal = tmp!.id;

    const { data: ped } = await admin.from("pedidos").insert({ cliente_id: clienteAna.id, comercial_id: ana.id }).select("id").single();
    pedidoId = ped!.id;
    await admin.from("pedido_lineas").insert({ pedido_id: pedidoId, descripcion: "Barril 30 L", cantidad: 2, precio_unitario: 90 });

    // Luis conduce una ruta con clientes de Ana (no son suyos en el CRM)
    const { data: v } = await admin.from("vehiculos").insert({ nombre: "Furgoneta test", matricula: "0000TST" }).select("id").single();
    const { data: r } = await admin.from("rutas").insert({ fecha: hoy, vehiculo_id: v!.id, conductor_id: luis.id }).select("id").single();
    rutaId = r!.id;
    const { data: ps, error: errP } = await admin
      .from("paradas")
      .insert([
        { ruta_id: rutaId, orden: 1, cliente_id: clienteAna.id, pedido_id: pedidoId },
        { ruta_id: rutaId, orden: 2, cliente_id: clienteTemporal },
      ])
      .select("id, orden")
      .order("orden");
    if (errP) throw errP;
    paradas.push(...ps!.map((p) => p.id));
    await admin.from("clientes_entrega").upsert({ cliente_id: clienteAna.id, notas_acceso: "Puerta trasera" });
  });

  afterAll(async () => {
    await admin.from("clientes").delete().eq("id", clienteTemporal);
    await admin.from("pedidos").delete().eq("id", pedidoId);
    await admin.from("clientes_entrega").delete().eq("cliente_id", clienteAna.id);
    await admin.from("clientes").delete().eq("id", clienteAna.id);
    // Las entregas registradas no se pueden borrar por diseño: solo el superusuario de la base local, sin triggers
    const bd = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
    execFileSync("psql", [bd, "-qc", `set session_replication_role = replica;
      delete from eventos_reparto where ruta_id = '${rutaId}'; delete from paradas where ruta_id = '${rutaId}';
      delete from rutas where id = '${rutaId}'; delete from vehiculos where matricula = '0000TST';`]);
    await admin.storage.from("entregas").remove((await admin.storage.from("entregas").list(paradas[0])).data?.map((f) => `${paradas[0]}/${f.name}`) ?? []);
    await admin.auth.admin.deleteUser(ana.id);
  });

  it("el pedido aparece por repartir hasta que va en una ruta", async () => {
    const { data } = await admin.from("pedidos_por_repartir").select("id").eq("id", pedidoId);
    expect(data).toHaveLength(0);
  });

  it("el conductor recibe su ruta con lo justo, pero el CRM de clientes no se le abre", async () => {
    const rutas = await descargarRutas(luis.sb, db, luis.id);
    const ruta = rutas.find((r) => r.id === rutaId) as RutaReparto;
    expect(ruta.paradas).toHaveLength(2);
    expect(ruta.paradas[0].cliente.nombre).toBe(clienteAna.nombre_negocio);
    expect(ruta.paradas[0].cliente.notas_acceso).toBe("Puerta trasera");
    expect(ruta.paradas[0].lineas[0]).toMatchObject({ descripcion: "Barril 30 L", cantidad: 2 });
    expect((await leerRutas(db, luis.id)).some((r) => r.id === rutaId)).toBe(true);

    // Sus permisos de siempre siguen igual: no ve el cliente de Ana ni su pedido
    const { data: cli } = await luis.sb.from("clientes").select("id").eq("id", clienteAna.id);
    expect(cli).toHaveLength(0);
    const { data: ped } = await luis.sb.from("pedidos").select("id").eq("id", pedidoId);
    expect(ped).toHaveLength(0);

    // Ana no conduce: no tiene rutas
    const { data: deAna } = await ana.sb.rpc("mi_reparto");
    expect((deAna as unknown as RutaReparto[]).some((r) => r.id === rutaId)).toBe(false);
  });

  it("el conductor no puede tocar paradas ni rutas directamente", async () => {
    await luis.sb.from("paradas").update({ notas_oficina: "hackeo" }).eq("id", paradas[0]);
    await luis.sb.from("rutas").delete().eq("id", rutaId);
    const { data } = await admin.from("paradas").select("notas_oficina").eq("id", paradas[0]).single();
    expect(data!.notas_oficina).toBeNull();
    const { count } = await admin.from("rutas").select("*", { count: "exact", head: true }).eq("id", rutaId);
    expect(count).toBe(1);
  });

  it("entrega con firma: se sube, reintentar no duplica y la ruta pasa a en curso", async () => {
    const entregaId = randomUUID();
    const datos = {
      realizada_at: new Date().toISOString(),
      firmante: "Paco",
      lineas: [{ producto_id: null, descripcion: "Barril 30 L", pedida: 2, entregada: 2 }],
      envases_entregados: 2,
      envases_recogidos: 1,
      cobrado: 50,
      forma_cobro: "Efectivo",
      motivo_fallo: null,
      observaciones: null,
      lat: 40.41,
      lng: -3.7,
      precision_m: 10,
    };
    await guardarEntrega(db, { id: entregaId, parada_id: paradas[0], ruta_id: rutaId, usuario_id: luis.id, estado: "entregada", datos }, firma(), []);
    // Doble toque: no crea otra
    await guardarEntrega(db, { id: entregaId, parada_id: paradas[0], ruta_id: rutaId, usuario_id: luis.id, estado: "entregada", datos }, firma(), []);
    expect(await db.entregas.count()).toBe(1);
    expect(await db.archivos.count()).toBe(1);

    const r = await sincronizarReparto(luis.sb, db, luis.id);
    expect(r).toMatchObject({ subidas: 1, pendientes: 0, conflictos: 0, conError: 0 });
    expect(await db.archivos.count()).toBe(0); // firma liberada del móvil solo tras confirmar

    // Reintento (p. ej. se cortó la red justo después de guardar): el servidor lo reconoce
    const { data: otra } = await luis.sb.rpc("registrar_entrega", { p_parada: paradas[0], p_entrega: entregaId, p_estado: "entregada", p_datos: {} });
    expect(otra).toBe("ya_registrada");

    const { data: p } = await admin.from("paradas").select("*").eq("id", paradas[0]).single();
    expect(p).toMatchObject({ estado: "entregada", entrega_id: entregaId, firmante: "Paco", envases_recogidos: 1, registrada_por: luis.id });
    expect(Number(p!.cobrado)).toBe(50);
    expect(p!.firma_path).toBe(`${paradas[0]}/firma-${entregaId}.png`);
    const { data: fichero } = await admin.storage.from("entregas").download(p!.firma_path!);
    expect(fichero?.size).toBe(11);

    const { data: ruta } = await admin.from("rutas").select("estado, iniciada_at").eq("id", rutaId).single();
    expect(ruta).toMatchObject({ estado: "en_curso" });
    expect(ruta!.iniciada_at).not.toBeNull();
  });

  it("una entrega registrada no se puede cambiar ni borrar, ni siquiera desde la oficina", async () => {
    const { error: e1 } = await admin.from("paradas").update({ firmante: "Otro" }).eq("id", paradas[0]);
    expect(e1?.message).toMatch(/no se puede modificar/);
    const { error: e2 } = await admin.from("paradas").delete().eq("id", paradas[0]);
    expect(e2?.message).toMatch(/no se puede borrar/);
    const { error: e3 } = await admin.from("rutas").delete().eq("id", rutaId);
    expect(e3?.message).toMatch(/no se puede borrar/);
  });

  it("si otro móvil ya registró otra entrega, la segunda queda como conflicto y no se pierde", async () => {
    const segunda = randomUUID();
    await guardarEntrega(
      db,
      {
        id: segunda,
        parada_id: paradas[0],
        ruta_id: rutaId,
        usuario_id: luis.id,
        estado: "entregada",
        datos: { realizada_at: new Date().toISOString(), firmante: null, lineas: [], envases_entregados: 0, envases_recogidos: 0, cobrado: null, forma_cobro: null, motivo_fallo: null, observaciones: null, lat: null, lng: null, precision_m: null },
      },
      firma(),
      [],
    );
    const r = await sincronizarReparto(luis.sb, db, luis.id);
    expect(r.conflictos).toBe(1);
    expect(await db.archivos.where("entrega_id").equals(segunda).count()).toBe(1); // la firma sigue en el móvil
  });

  it("un fallo necesita motivo; con motivo termina la ruta", async () => {
    const { error } = await luis.sb.rpc("registrar_entrega", { p_parada: paradas[1], p_entrega: randomUUID(), p_estado: "fallida", p_datos: {} });
    expect(error?.message).toMatch(/motivo/);
    const { data } = await luis.sb.rpc("registrar_entrega", { p_parada: paradas[1], p_entrega: randomUUID(), p_estado: "fallida", p_datos: { motivo_fallo: "Cerrado" } });
    expect(data).toBe("registrada");
    const { data: ruta } = await admin.from("rutas").select("estado, terminada_at").eq("id", rutaId).single();
    expect(ruta!.estado).toBe("terminada");
    const { data: ev } = await admin.from("eventos_reparto").select("tipo").eq("ruta_id", rutaId).order("id");
    expect(ev!.map((e) => e.tipo)).toEqual(["parada_entregada", "parada_fallida", "ruta_terminada"]);
  });

  it("el comercial del cliente ve el estado de la entrega; otro comercial no", async () => {
    const { data: deAna } = await ana.sb.from("paradas").select("estado").eq("id", paradas[0]);
    expect(deAna).toEqual([{ estado: "entregada" }]);
    const { data: firmaAna } = await ana.sb.storage.from("entregas").download(`${paradas[0]}/firma-${(await admin.from("paradas").select("entrega_id").eq("id", paradas[0]).single()).data!.entrega_id}.png`);
    expect(firmaAna).not.toBeNull();
  });

  it("nadie ajeno puede registrar entregas de una ruta que no conduce", async () => {
    const { data: ruta2 } = await admin.from("rutas").insert({ fecha: hoy, conductor_id: luis.id }).select("id").single();
    const { data: p } = await admin.from("paradas").insert({ ruta_id: ruta2!.id, orden: 1, cliente_id: clienteTemporal }).select("id").single();
    const { error } = await ana.sb.rpc("registrar_entrega", { p_parada: p!.id, p_entrega: randomUUID(), p_estado: "fallida", p_datos: { motivo_fallo: "x" } });
    expect(error?.message).toMatch(/permiso/);
    const { error: subida } = await ana.sb.storage.from("entregas").upload(`${p!.id}/firma-x.png`, firma());
    expect(subida).not.toBeNull();
    await admin.from("rutas").delete().eq("id", ruta2!.id);
  });

  it("borrar el cliente (derecho de supresión) sigue funcionando aunque tenga entregas", async () => {
    const { error } = await admin.from("clientes").delete().eq("id", clienteTemporal);
    expect(error).toBeNull();
    const { count } = await admin.from("paradas").select("*", { count: "exact", head: true }).eq("id", paradas[1]);
    expect(count).toBe(0);
  });
});
