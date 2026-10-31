// Consultas que usa la IA, contra Supabase local (`npm run db:start`). Se salta si no está levantado.
import { createClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import type { Database } from "@/lib/supabase/tipos-bd";

vi.mock("server-only", () => ({}));
const { buscarClientes, consultarAlbaranes, consultarReparto, consultarVisitas, riesgoYPrevision, sumarDias } = await import("@/lib/ia/datos");

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
  const { error } = await sb.auth.verifyOtp({ email, token: data.properties!.email_otp, type: "email" });
  if (error) throw error;
  return sb;
}
const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());

describe.skipIf(!disponible)("datos para la IA", () => {
  it("la comercial solo ve sus clientes; dirección ve todos", async () => {
    const [ana, dir] = await Promise.all([sesionDe("ana@demo.local"), sesionDe("admin@demo.local")]);
    const [a, d] = await Promise.all([buscarClientes(ana, hoy, {}), buscarClientes(dir, hoy, {})]);
    expect(a.total).toBeGreaterThan(0);
    expect(d.total).toBeGreaterThan(a.total);
    expect(new Set(a.clientes.map((c) => c.comercial))).toEqual(new Set(["Ana (demo)"]));
    const vencidos = await buscarClientes(dir, hoy, { seguimiento_vencido: true });
    expect(vencidos.clientes.every((c) => c.proxima_accion && c.proxima_accion.slice(-11, -1) < hoy)).toBe(true);
    const porComercial = await buscarClientes(dir, hoy, { comercial: "luis" });
    expect(porComercial.clientes.every((c) => c.comercial === "Luis (demo)")).toBe(true);
  });

  it("resume visitas, reparto, albaranes, riesgo y previsión sin errores", async () => {
    const dir = await sesionDe("admin@demo.local");
    const desde = sumarDias(hoy, -60);
    const v = await consultarVisitas(dir, { desde, hasta: hoy });
    expect(v.total).toBeGreaterThan(0);
    expect(Object.values(v.por_comercial).reduce((s, n) => s + n, 0)).toBe(v.total);
    expect(v.visitas.length).toBeLessThanOrEqual(60);
    const r = await consultarReparto(dir, { desde, hasta: hoy });
    expect(r.paradas).toBeGreaterThanOrEqual(0);
    const al = await consultarAlbaranes(dir, { desde, hasta: hoy });
    expect(al.albaranes).toBeGreaterThanOrEqual(0);
    const rp = await riesgoYPrevision(dir, hoy);
    expect(Array.isArray(rp.clientes_en_riesgo) && Array.isArray(rp.les_toca_pedir)).toBe(true);
  });
});
