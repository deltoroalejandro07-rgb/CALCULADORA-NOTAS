// Acceso pulsando el enlace del email (lo que manda la plantilla por defecto de Supabase).
// Uso: node tests/e2e-enlace.mjs   (con Supabase local y la app en :3000)
import { chromium, devices } from "@playwright/test";
import assert from "node:assert/strict";

const APP = "http://localhost:3000";
const MAILPIT = "http://127.0.0.1:54324";

const navegador = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const page = await (await navegador.newContext({ ...devices["iPhone 13"], locale: "es-ES" })).newPage();

await fetch(`${MAILPIT}/api/v1/messages`, { method: "DELETE" });
await page.goto(`${APP}/login`);
await page.getByLabel("Tu email").fill("luis@demo.local");
await page.getByRole("button", { name: "Enviarme un código" }).click();
await page.getByLabel("Código").waitFor();

let enlace;
for (let i = 0; i < 20 && !enlace; i++) {
  const r = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent("to:luis@demo.local")}&limit=1`).then((r) => r.json());
  const id = r.messages?.[0]?.ID;
  if (id) {
    const m = await fetch(`${MAILPIT}/api/v1/message/${id}`).then((r) => r.json());
    enlace = m.HTML?.match(/href="([^"]+)"/)?.[1]?.replaceAll("&amp;", "&");
  }
  if (!enlace) await new Promise((r) => setTimeout(r, 500));
}
assert.ok(enlace, "el email debe traer enlace");
await page.goto(enlace);
await page.waitForURL("**/hoy");
await page.getByText("Hola, Luis").waitFor();
console.log("✓ Entrada por enlace → /hoy como Luis");

// Un enlace ya usado no debe dar acceso
await page.context().clearCookies();
await page.goto(enlace);
await page.waitForURL("**/login**");
await page.getByText(/caducado o ya se usó|no tiene acceso/).waitFor();
console.log("✓ Enlace reutilizado → vuelve al login con aviso");
await navegador.close();
