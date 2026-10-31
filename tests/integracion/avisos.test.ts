// Avisos push contra Supabase local y un «servicio de avisos» falso (no sale a internet).
import { createClient } from "@supabase/supabase-js";
import { createECDH, randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { createServer } from "node:https";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import webpush from "web-push";
import type { Database } from "@/lib/supabase/tipos-bd";

vi.mock("server-only", () => ({}));
try {
  process.loadEnvFile(".env.local");
} catch {}
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SECRETA = process.env.SUPABASE_SECRET_KEY ?? "";
const disponible =
  /127\.0\.0\.1|localhost/.test(URL) &&
  !!SECRETA &&
  (await fetch(`${URL}/auth/v1/health`, { headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "" } })
    .then((r) => r.ok)
    .catch(() => false));
const admin = createClient<Database>(URL || "http://127.0.0.1", SECRETA || "x", { auth: { persistSession: false } });
const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());

describe.skipIf(!disponible)("avisos en el móvil", () => {
  const recibidos: { ruta: string; cabeceras: Record<string, unknown> }[] = [];
  let respuesta = 201;
  // web-push solo habla HTTPS: certificado de prueba hecho al vuelo
  const dir = mkdtempSync(join(tmpdir(), "avisos-"));
  execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-subj", "/CN=127.0.0.1", "-keyout", join(dir, "k.pem"), "-out", join(dir, "c.pem"), "-days", "1"], { stdio: "ignore" });
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  const servidor = createServer({ key: readFileSync(join(dir, "k.pem")), cert: readFileSync(join(dir, "c.pem")) }, (req, res) => {
    req.resume();
    recibidos.push({ ruta: req.url ?? "", cabeceras: req.headers });
    res.statusCode = respuesta;
    res.end();
  });
  let base = "";
  let anaId = "";
  const claves = () => {
    const e = createECDH("prime256v1");
    e.generateKeys();
    return { p256dh: e.getPublicKey().toString("base64url"), auth: randomBytes(16).toString("base64url") };
  };

  beforeAll(async () => {
    await new Promise<void>((ok) => servidor.listen(0, "127.0.0.1", ok));
    base = `https://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
    const k = webpush.generateVAPIDKeys();
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = k.publicKey;
    process.env.VAPID_PRIVATE_KEY = k.privateKey;
    anaId = (await admin.from("perfiles").select("id").eq("email", "ana@demo.local").single()).data!.id;
    await admin.from("push_suscripciones").delete().eq("usuario_id", anaId);
    await admin.from("agenda").delete().eq("usuario_id", anaId);
    await admin.from("agenda").insert({ usuario_id: anaId, tipo: "reunion", titulo: "Reunión prueba", fecha: hoy, hora_inicio: "10:00" });
    await admin.from("push_suscripciones").insert({ usuario_id: anaId, endpoint: `${base}/movil-ana`, ...claves() });
  });
  afterAll(async () => {
    servidor.close();
    delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    await admin.from("push_suscripciones").delete().eq("usuario_id", anaId);
    await admin.from("agenda").delete().eq("usuario_id", anaId);
    delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;
  });

  it("el resumen de la mañana llega al móvil de la comercial, cifrado y firmado", async () => {
    const { enviarAvisosDiarios } = await import("@/lib/avisos");
    const n = await enviarAvisosDiarios(hoy);
    expect(n).toBeGreaterThanOrEqual(1);
    const r = recibidos.find((x) => x.ruta === "/movil-ana")!;
    expect(r).toBeTruthy();
    expect(r.cabeceras["content-encoding"]).toBe("aes128gcm");
    expect(String(r.cabeceras.authorization)).toMatch(/^vapid t=/);
  });

  it("si el móvil ya no acepta avisos (410), se borra su suscripción", async () => {
    const { enviarAvisos } = await import("@/lib/avisos");
    respuesta = 410;
    expect(await enviarAvisos([anaId], { titulo: "x", cuerpo: "y" })).toBe(0);
    const { count } = await admin.from("push_suscripciones").select("*", { count: "exact", head: true }).eq("usuario_id", anaId);
    expect(count).toBe(0);
    respuesta = 201;
  });
});
