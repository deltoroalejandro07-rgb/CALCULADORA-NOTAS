// Integración contra Supabase local (`npm run db:start`). Se salta si no está levantado.
import "fake-indexeddb/auto";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { BaseLocal, type VisitaNueva } from "@/lib/offline/db";
import { encolarVisita, esErrorTemporal, refrescarCopiaLocal, sincronizar } from "@/lib/offline/sincronizar";
import type { Database } from "@/lib/supabase/tipos-bd";

// Claves de .env.local (nunca en el repositorio)
try {
  process.loadEnvFile(".env.local");
} catch {}
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const PUBLICA = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const SECRETA = process.env.SUPABASE_SECRET_KEY ?? "";

const disponible =
  /127\.0\.0\.1|localhost/.test(URL) && // solo contra la base local: el test crea y borra datos
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

function visita(clienteId: string, extra: Partial<VisitaNueva> = {}): VisitaNueva {
  return {
    id: randomUUID(),
    cliente_id: clienteId,
    fecha: new Date().toISOString(),
    lat: 40.41,
    lng: -3.7,
    precision_m: 12,
    tipo: "puerta_fria",
    resultado: "pide_oferta",
    material_entregado: ["Catálogo"],
    notas: "Prueba de integración",
    proxima_accion: "Enviar oferta",
    proxima_accion_fecha: "2026-12-01",
    productos: [],
    fotos: [],
    consentimientos: [],
    ...extra,
  };
}

const creados: string[] = [];

describe.skipIf(!disponible)("sincronización con Supabase", () => {
  let ana: Awaited<ReturnType<typeof sesionDe>>;
  let db: BaseLocal;

  beforeAll(async () => {
    ana = await sesionDe("ana@demo.local");
    db = new BaseLocal("test-" + randomUUID());
    await refrescarCopiaLocal(ana.sb, db);
  });

  afterAll(async () => {
    if (creados.length) await admin.from("clientes").delete().in("id", creados);
  });

  it("la copia local solo trae los clientes de Ana y el catálogo", async () => {
    const { count: deAna } = await admin.from("clientes").select("*", { count: "exact", head: true }).eq("comercial_id", ana.id);
    const { count: total } = await admin.from("clientes").select("*", { count: "exact", head: true });
    expect(await db.clientes.count()).toBe(deAna);
    expect(deAna).toBeLessThan(total!);
    expect(await db.productos.count()).toBeGreaterThan(10);
  });

  it("cliente nuevo + visita con productos, consentimiento y foto; reintentar no duplica", async () => {
    const producto = (await db.productos.toArray())[0];
    const clienteId = randomUUID();
    creados.push(clienteId);
    const fotoId = randomUUID();
    const v = visita(clienteId, {
      productos: [{ producto_id: producto.id, relacion: "interes" }],
      consentimientos: [{ id: randomUUID(), canal: "whatsapp" }],
      fotos: [{ id: fotoId, tipo: "barra" }],
    });
    await encolarVisita(db, v, [{ id: fotoId, blob: new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], { type: "image/jpeg" }) }], {
      id: clienteId,
      nombre_negocio: "Bar Prueba Integración",
      tipo: "bar",
      telefono: "+34600999999",
      contacto_nombre: null,
      lat: null,
      lng: null,
    });
    expect((await db.clientes.get(clienteId))?.estado).toBe("interesado"); // reflejo local inmediato

    const r = await sincronizar(ana.sb, db, ana.id);
    if (r.conError) console.log("ERRORES:", (await db.cola.toArray()).map((o) => o.error));
    expect(r).toMatchObject({ subidas: 2, pendientes: 0, conError: 0 });

    const { data: c } = await admin.from("clientes").select("*").eq("id", clienteId).single();
    expect(c).toMatchObject({ comercial_id: ana.id, estado: "interesado", consiente_whatsapp: true, proxima_accion: "Enviar oferta" });
    const { count: intereses } = await admin.from("cliente_productos_interes").select("*", { count: "exact", head: true }).eq("cliente_id", clienteId);
    expect(intereses).toBe(1);
    const { data: fotos } = await admin.from("visita_fotos").select("storage_path").eq("visita_id", v.id);
    expect(fotos).toHaveLength(1);
    const { data: fichero } = await ana.sb.storage.from("visitas").download(fotos![0].storage_path);
    expect(fichero?.size).toBe(4);

    // Simula que el móvil no se enteró de la respuesta y reintenta todo
    await db.cola.put({ id: clienteId, tipo: "cliente", datos: { id: clienteId, nombre_negocio: "Bar Prueba Integración", tipo: "bar", telefono: null, contacto_nombre: null, lat: null, lng: null }, creada_at: 1, intentos: 0 });
    await db.cola.put({ id: v.id, tipo: "visita", datos: v, creada_at: 2, intentos: 0 });
    await db.fotos.put({ id: fotoId, visita_id: v.id, cliente_id: clienteId, blob: new Blob([new Uint8Array([1])]) });
    expect(await sincronizar(ana.sb, db, ana.id)).toMatchObject({ subidas: 2, pendientes: 0 });
    const { count: visitas } = await admin.from("visitas").select("*", { count: "exact", head: true }).eq("cliente_id", clienteId);
    expect(visitas).toBe(1);
    const { count: consent } = await admin.from("consentimientos").select("*", { count: "exact", head: true }).eq("cliente_id", clienteId);
    expect(consent).toBe(1);
  });

  it("una visita a un cliente ajeno queda marcada con error y no bloquea la cola", async () => {
    const { data: deLuis } = await admin.from("clientes").select("id, perfiles!clientes_comercial_id_fkey!inner(email)").eq("perfiles.email", "luis@demo.local").limit(1).single();
    const ajena = visita(deLuis!.id);
    const propiaCliente = (await db.clientes.filter((c) => !c.pendiente).first())!;
    const propia = visita(propiaCliente.id, { resultado: "no_estaba" });
    await encolarVisita(db, ajena, []);
    await encolarVisita(db, propia, []);

    const r = await sincronizar(ana.sb, db, ana.id);
    expect(r).toMatchObject({ subidas: 1, pendientes: 1, conError: 1, sinConexion: false });
    expect((await db.cola.get(ajena.id))?.error).toMatch(/row-level security/);
    await admin.from("visitas").delete().eq("id", propia.id);
  });

  it("sin red la cola se conserva para reintentar", async () => {
    const sinRed = createClient<Database>("http://127.0.0.1:9", PUBLICA, { auth: { persistSession: false } });
    await db.cola.clear();
    const v = visita((await db.clientes.filter((c) => !c.pendiente).first())!.id);
    await encolarVisita(db, v, []);
    const r = await sincronizar(sinRed, db, ana.id);
    expect(r).toMatchObject({ subidas: 0, pendientes: 1, sinConexion: true });
    expect((await db.cola.get(v.id))?.intentos).toBe(1);
    await db.cola.clear();
  });
});

describe("esErrorTemporal", () => {
  it.each([
    [{ message: "TypeError: Failed to fetch" }, true],
    [{ message: "Load failed" }, true],
    [{ code: "PGRST301", message: "JWT expired" }, true],
    [{ code: "08006", message: "connection failure" }, true],
    [{ statusCode: "503", message: "Service Unavailable" }, true],
    [{ code: "42501", message: "new row violates row-level security policy" }, false],
    [{ code: "23503", message: "violates foreign key constraint" }, false],
    [{ code: "P0001", message: "El cliente no tiene consentimiento" }, false],
  ])("%o → %s", (e, esperado) => expect(esErrorTemporal(e)).toBe(esperado));
});
