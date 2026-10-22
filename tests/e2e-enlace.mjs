// Acceso pulsando el enlace del email (lo que manda la plantilla por defecto de Supabase).
// Caso real del móvil: se pide en un navegador y el enlace se abre en OTRO (Mail → Safari,
// Gmail → su navegador interno). Debe funcionar igual.
// Uso: node tests/e2e-enlace.mjs   (con Supabase local y la app en :3000)
import assert from "node:assert/strict";
import { abrirNavegador, APP, MAILPIT } from "./e2e-util.mjs";

const pidiendo = await abrirNavegador();
await fetch(`${MAILPIT}/api/v1/messages`, { method: "DELETE" });
await pidiendo.page.goto(`${APP}/login`);
await pidiendo.page.getByLabel("Tu email").fill("luis@demo.local");
await pidiendo.page.getByRole("button", { name: "Enviarme un código" }).click();
await pidiendo.page.getByLabel("Código").waitFor();
await pidiendo.navegador.close();

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

// Otro navegador, sin ninguna cookie del que pidió el acceso
const otro = await abrirNavegador();
await otro.page.goto(enlace);
await otro.page.waitForURL("**/hoy");
await otro.page.getByText("Hola, Luis").waitFor();
console.log("✓ Enlace abierto en otro navegador → /hoy como Luis");
await otro.navegador.close();

// Un enlace ya usado no debe dar acceso
const tercero = await abrirNavegador();
await tercero.page.goto(enlace);
await tercero.page.waitForURL("**/login**");
await tercero.page.getByText(/caducado o ya se usó/).waitFor();
console.log("✓ Enlace reutilizado → vuelve al login con aviso");
await tercero.navegador.close();
