// Comprueba la forma de las peticiones a la IA y el bucle de herramientas con un servidor falso
// (no gasta ni necesita clave real). Necesita Supabase local para las herramientas.
import { createClient } from "@supabase/supabase-js";
import { createServer, type IncomingMessage } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Database } from "@/lib/supabase/tipos-bd";

vi.mock("server-only", () => ({}));

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

const leer = (req: IncomingMessage) => new Promise<string>((ok) => {
  let b = "";
  req.on("data", (c) => (b += c));
  req.on("end", () => ok(b));
});
const mensaje = (content: unknown[], stop_reason: string) => ({
  id: "msg_" + Math.random().toString(36).slice(2),
  type: "message",
  role: "assistant",
  model: "claude-opus-5-5",
  content,
  stop_reason,
  stop_sequence: null,
  usage: { input_tokens: 10, output_tokens: 10 },
});

describe.skipIf(!disponible)("peticiones a la IA (servidor falso)", () => {
  const recibidas: { cabeceras: IncomingMessage["headers"]; cuerpo: Record<string, unknown> }[] = [];
  let respuestas: unknown[] = [];
  const servidor = createServer(async (req, res) => {
    recibidas.push({ cabeceras: req.headers, cuerpo: JSON.parse(await leer(req)) });
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify(respuestas.shift()));
  });

  beforeAll(async () => {
    await new Promise<void>((ok) => servidor.listen(0, "127.0.0.1", ok));
    process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
    process.env.ANTHROPIC_API_KEY = "clave-de-prueba";
  });
  afterAll(() => {
    servidor.close();
    delete process.env.ANTHROPIC_BASE_URL;
    delete process.env.ANTHROPIC_API_KEY;
  });

  it("«Pregúntale a tu CRM» usa las herramientas con los datos del usuario y devuelve el texto", async () => {
    const { preguntarCRM } = await import("@/lib/ia/ia");
    const admin = createClient<Database>(URL, SECRETA, { auth: { persistSession: false } });
    const sb = createClient<Database>(URL, PUBLICA, { auth: { persistSession: false } });
    const { data } = await admin.auth.admin.generateLink({ type: "magiclink", email: "ana@demo.local" });
    await sb.auth.verifyOtp({ email: "ana@demo.local", token: data.properties!.email_otp, type: "email" });

    respuestas = [
      mensaje([{ type: "tool_use", id: "toolu_1", name: "buscar_clientes", input: { estado: "interesado" } }], "tool_use"),
      mensaje([{ type: "text", text: "Tienes 5 clientes interesados." }], "end_turn"),
    ];
    const texto = await preguntarCRM(sb as never, [{ rol: "usuario", texto: "¿Cuántos interesados tengo?" }]);
    expect(texto).toBe("Tienes 5 clientes interesados.");

    const [p1, p2] = recibidas.slice(-2);
    expect(p1.cabeceras["anthropic-beta"]).toContain("server-side-fallback-2026-07-01");
    expect(p1.cuerpo).toMatchObject({ model: "claude-opus-5-5", fallbacks: "default", output_config: { effort: "medium" } });
    expect((p1.cuerpo.tools as { name: string }[]).map((t) => t.name)).toEqual(["buscar_clientes", "consultar_visitas", "consultar_reparto", "consultar_albaranes", "riesgo_y_prevision"]);
    expect(String(p1.cuerpo.system)).toMatch(/Hoy es \d{4}-\d{2}-\d{2}/);
    // Segunda vuelta: lleva el resultado de la herramienta, con los clientes que ve Ana (RLS)
    const msgs = p2.cuerpo.messages as { role: string; content: { type: string; content?: string }[] | string }[];
    const resultado = (msgs.at(-1)!.content as { type: string; content: string }[]).find((b) => b.type === "tool_result")!;
    const datos = JSON.parse(typeof resultado.content === "string" ? resultado.content : (resultado.content as unknown as { text: string }[])[0].text);
    expect(datos.total).toBeGreaterThan(0);
    expect(datos.clientes.every((c: { estado: string; comercial: string }) => c.estado === "Interesado" && c.comercial === "Ana (demo)")).toBe(true);
  });

  it("el mensaje de seguimiento manda el contexto del cliente y devuelve el texto", async () => {
    const { redactarSeguimientoIA } = await import("@/lib/ia/ia");
    respuestas = [mensaje([{ type: "text", text: "Hola Paco, soy Ana…" }], "end_turn")];
    const t = await redactarSeguimientoIA({ comercial: "Ana", cliente: { nombre: "Bar Manolo" }, visitas: [{ resultado: "Interesado" }] });
    expect(t).toBe("Hola Paco, soy Ana…");
    expect(JSON.stringify(recibidas.at(-1)!.cuerpo.messages)).toContain("Bar Manolo");
  });

  it("si la IA rechaza la petición, da un error entendible", async () => {
    const { redactarResumenIA } = await import("@/lib/ia/ia");
    respuestas = [mensaje([], "refusal")];
    await expect(redactarResumenIA("hoy", {})).rejects.toThrow("La IA no ha podido responder a esto.");
  });
});
