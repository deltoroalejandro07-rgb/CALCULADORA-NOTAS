// Recorrido de humo con capturas en tamaño móvil. Requiere `npm run db:start` y la app en :3000.
// Uso: node tests/e2e-capturas.mjs <carpeta-salida>
import { chromium, devices } from "@playwright/test";

const SALIDA = process.argv[2] ?? "capturas";
const APP = "http://localhost:3000";
const MAILPIT = "http://127.0.0.1:54324";

async function codigoDe(email) {
  for (let i = 0; i < 20; i++) {
    const r = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent("to:" + email)}&limit=1`).then((r) => r.json());
    const id = r.messages?.[0]?.ID;
    if (id) {
      const m = await fetch(`${MAILPIT}/api/v1/message/${id}`).then((r) => r.json());
      const codigo = m.Text?.match(/\b\d{6}\b/)?.[0] ?? m.HTML?.match(/>\s*(\d{6})\s*</)?.[1];
      if (codigo) return codigo;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("No llegó el código a " + email);
}

async function entrar(page, email) {
  await fetch(`${MAILPIT}/api/v1/messages`, { method: "DELETE" });
  await page.goto(`${APP}/hoy`);
  await page.waitForURL("**/login");
  await page.getByLabel("Tu email").fill(email);
  await page.getByRole("button", { name: "Enviarme un código" }).click();
  await page.getByLabel("Código").waitFor();
  return codigoDe(email);
}

const navegador = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const ctx = await navegador.newContext({ ...devices["iPhone 13"], locale: "es-ES", timezoneId: "Europe/Madrid" });
const page = await ctx.newPage();
const errores = [];
page.on("pageerror", (e) => errores.push(e.message));
page.on("console", (m) => m.type() === "error" && errores.push(m.text()));

// Ana (comercial)
await page.goto(`${APP}/login`);
await page.screenshot({ path: `${SALIDA}/01-login.png` });
const codigo = await entrar(page, "ana@demo.local");
await page.screenshot({ path: `${SALIDA}/02-codigo.png` });
await page.getByLabel("Código").fill(codigo);
await page.getByRole("button", { name: "Entrar" }).click();
await page.waitForURL("**/hoy");
await page.getByText("Seguimientos vencidos").waitFor();
await page.screenshot({ path: `${SALIDA}/03-hoy-ana.png` });
await page.getByRole("link", { name: "Clientes" }).click();
await page.getByText("Asignados a ti").waitFor();
console.log("Ana:", await page.getByText(/^\d+ de \d+$/).textContent());
await page.screenshot({ path: `${SALIDA}/04-clientes-ana.png`, fullPage: false });
await page.getByRole("link", { name: "Más" }).click();
await page.getByText("Apariencia").waitFor();
await page.getByRole("radio", { name: "Oscuro" }).click();
await page.screenshot({ path: `${SALIDA}/05-mas-oscuro.png` });
await page.getByRole("link", { name: "Hoy" }).click();
await page.getByText("Seguimientos vencidos").waitFor();
await page.screenshot({ path: `${SALIDA}/06-hoy-oscuro.png` });
await page.getByRole("link", { name: "Registrar visita", exact: true }).click();
await page.getByRole("button", { name: /Guardar visita/ }).waitFor();
await page.getByRole("link", { name: "Más" }).click();
await page.getByRole("radio", { name: "Claro" }).click();
await page.getByRole("button", { name: "Cerrar sesión" }).click();
await page.waitForURL("**/login");

// Email sin acceso
await page.getByLabel("Tu email").fill("desconocido@ejemplo.com");
await page.getByRole("button", { name: "Enviarme un código" }).click();
await page.getByText("no tiene acceso").waitFor();
await page.screenshot({ path: `${SALIDA}/07-sin-acceso.png` });

// Administrador
await page.goto(`${APP}/login`);
const codigoAdmin = await entrar(page, "admin@demo.local");
await page.getByLabel("Código").fill(codigoAdmin);
await page.getByRole("button", { name: "Entrar" }).click();
await page.waitForURL("**/hoy");
await page.getByRole("link", { name: "Clientes" }).click();
await page.getByText("Todos los clientes").waitFor();
console.log("Admin:", await page.getByText(/^\d+ de \d+$/).textContent());
await page.screenshot({ path: `${SALIDA}/08-clientes-admin.png` });
await page.getByRole("link", { name: "Más" }).click();
await page.getByText("Panel de dirección").waitFor();
await page.screenshot({ path: `${SALIDA}/09-mas-admin.png` });

console.log(errores.length ? "ERRORES:\n" + errores.join("\n") : "Sin errores en consola");
await navegador.close();
