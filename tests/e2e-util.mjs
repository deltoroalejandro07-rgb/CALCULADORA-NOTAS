// Utilidades comunes de los recorridos con navegador.
import { chromium, devices } from "@playwright/test";
import { execFileSync } from "node:child_process";

export const APP = process.env.APP_URL ?? "http://localhost:3000";
export const MAILPIT = "http://127.0.0.1:54324";
const BD = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

export const sql = (q) => execFileSync("psql", [BD, "-tAc", q]).toString().trim();
export const paso = (t) => console.log("•", t);

export async function abrirNavegador(opciones = {}) {
  const navegador = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const ctx = await navegador.newContext({
    ...devices["iPhone 13"],
    locale: "es-ES",
    timezoneId: "Europe/Madrid",
    geolocation: { latitude: 40.4155, longitude: -3.7074, accuracy: 15 },
    permissions: ["geolocation"],
    ...opciones,
  });
  const page = await ctx.newPage();
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message));
  return { navegador, ctx, page, errores };
}

async function codigoDe(email) {
  for (let i = 0; i < 20; i++) {
    const r = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent("to:" + email)}&limit=1`).then((r) => r.json());
    const id = r.messages?.[0]?.ID;
    if (id) {
      const m = await fetch(`${MAILPIT}/api/v1/message/${id}`).then((r) => r.json());
      const c = m.Text?.match(/\b\d{6}\b/)?.[0];
      if (c) return c;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("No llegó el código a " + email);
}

export async function entrar(page, email) {
  await fetch(`${MAILPIT}/api/v1/messages`, { method: "DELETE" });
  await page.goto(`${APP}/login`);
  await page.getByLabel("Tu email").fill(email);
  await page.getByRole("button", { name: "Enviarme un código" }).click();
  await page.getByLabel("Código").fill(await codigoDe(email));
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/hoy");
}
