// Recorrido del registro de visita, con y sin cobertura. Requiere `npm run db:start`,
// `npm run build && npm start` (el service worker solo se activa en producción).
// Uso: CHROMIUM=/ruta node tests/e2e-visita.mjs <carpeta-capturas>
import { chromium, devices } from "@playwright/test";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";

const SALIDA = process.argv[2] ?? "capturas";
const APP = "http://localhost:3000";
const MAILPIT = "http://127.0.0.1:54324";
const BD = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

const sql = (q) => execFileSync("psql", [BD, "-tAc", q]).toString().trim();
const paso = (t) => console.log("•", t);

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
  throw new Error("No llegó el código");
}

// Limpieza de ejecuciones anteriores
sql("delete from clientes where nombre_negocio = 'Bar Sin Cobertura E2E'");
sql("delete from visitas where notas like 'E2E:%'");

const navegador = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const ctx = await navegador.newContext({
  ...devices["iPhone 13"],
  locale: "es-ES",
  timezoneId: "Europe/Madrid",
  geolocation: { latitude: 40.4155, longitude: -3.7074, accuracy: 15 }, // Plaza Mayor
  permissions: ["geolocation"],
  serviceWorkers: "allow",
});
const page = await ctx.newPage();
const errores = [];
page.on("pageerror", (e) => errores.push(e.message));

paso("Entrar como Ana");
await fetch(`${MAILPIT}/api/v1/messages`, { method: "DELETE" });
await page.goto(`${APP}/login`);
await page.getByLabel("Tu email").fill("ana@demo.local");
await page.getByRole("button", { name: "Enviarme un código" }).click();
await page.getByLabel("Código").fill(await codigoDe("ana@demo.local"));
await page.getByRole("button", { name: "Entrar" }).click();
await page.waitForURL("**/hoy");

paso("Visita con cobertura: cliente cercano, pide oferta, productos, nota, foto, consentimiento");
await page.getByRole("link", { name: "Registrar visita" }).click();
await page.getByText("Más cercanos a ti").waitFor();
await page.screenshot({ path: `${SALIDA}/10-visita-vacia.png` });
const primero = page.locator("ul li button").first();
const nombreCliente = (await primero.locator("p").first().textContent()).trim();
const t0 = Date.now();
await primero.click();
await page.getByRole("radio", { name: "Pide oferta" }).click();
const chips = page.getByRole("button", { name: /: sin marcar$/ });
await chips.nth(0).click(); // presentado
await chips.nth(0).click(); // el siguiente sin marcar → presentado
await page.getByRole("button", { name: /: presentado$/ }).first().click(); // → le interesa
await page.getByLabel("Nota", { exact: true }).fill("E2E: quiere precio de barril antes del viernes");
await page.locator('input[type="file"]').setInputFiles("tests/fixtures/barra.jpg");
await page.getByRole("button", { name: "Quitar foto" }).waitFor();
const consentimiento = page.getByRole("button", { name: "Acepta WhatsApp" });
if (await consentimiento.isVisible()) await consentimiento.click();
await page.screenshot({ path: `${SALIDA}/11-visita-rellena.png`, fullPage: true });
await page.getByRole("button", { name: /Guardar visita/ }).click();
await page.getByText("Visita guardada").waitFor();
console.log(`  rellenada y guardada en ${((Date.now() - t0) / 1000).toFixed(1)} s (automatizado)`);
await page.screenshot({ path: `${SALIDA}/12-visita-guardada.png` });

// Esperar a que suba
for (let i = 0; i < 30 && sql("select count(*) from visitas where notas like 'E2E: quiere%'") !== "1"; i++) await page.waitForTimeout(300);
const fila = sql(`select c.estado || '|' || c.proxima_accion || '|' || (select count(*) from visita_fotos f where f.visita_id = v.id) || '|' || (select count(*) from visita_productos p where p.visita_id = v.id) || '|' || (v.lat is not null)
                  from visitas v join clientes c on c.id = v.cliente_id where v.notas like 'E2E: quiere%'`);
console.log("  en BD:", fila);
const [estado, accion, nFotos, nProductos, conGps] = fila.split("|");
assert.ok(["interesado", "cliente"].includes(estado), "el cliente debe quedar interesado (o seguir cliente)");
assert.equal(accion, "Preparar y enviar oferta");
assert.equal(nFotos, "1");
assert.equal(nProductos, "2");
assert.equal(conGps, "true");
const tamFoto = Number(sql("select (metadata->>'size') from storage.objects where bucket_id = 'visitas' order by created_at desc limit 1"));
console.log(`  foto comprimida: ${Math.round(tamFoto / 1024)} KB (original 177 KB a 3000×2000)`);
console.log(`  cliente: ${nombreCliente}`);

paso("Esperar a que el service worker guarde la pantalla para usarla sin red");
await page.evaluate(async () => {
  const r = await navigator.serviceWorker.ready;
  r.active.postMessage("cachear-offline");
});
for (let i = 0; i < 30; i++) {
  const ok = await page.evaluate(async () => !!(await caches.match("/visita/nueva")));
  if (ok) break;
  await page.waitForTimeout(300);
}

paso("Sin cobertura: cliente nuevo + visita");
await ctx.setOffline(true);
await page.getByRole("button", { name: "Registrar otra visita" }).click();
await page.getByRole("button", { name: "Cliente nuevo" }).click();
await page.getByLabel("Nombre del negocio").fill("Bar Sin Cobertura E2E");
await page.getByRole("radio", { name: "Pub" }).click();
await page.getByLabel("Teléfono").fill("600 00 99 99");
await page.getByRole("radio", { name: "Interesado" }).click();
await page.getByText("Pasará de").waitFor();
await page.getByLabel("Nota", { exact: true }).fill("E2E: registrada sin cobertura");
await page.screenshot({ path: `${SALIDA}/13-sin-cobertura-rellena.png` });
await page.getByRole("button", { name: /Guardar visita/ }).click();
await page.getByText("Sin cobertura: está guardada en el móvil").waitFor();
await page.getByText("Sin cobertura · 1 visita en el móvil").waitFor(); // aviso superior
await page.screenshot({ path: `${SALIDA}/14-sin-cobertura-guardada.png` });
assert.equal(sql("select count(*) from clientes where nombre_negocio = 'Bar Sin Cobertura E2E'"), "0", "sin red no debe haber llegado");

paso("Abrir la app en frío sin cobertura (recarga completa)");
await page.goto(`${APP}/hoy`).catch(() => {});
await page.waitForURL("**/visita/nueva");
await page.getByRole("button", { name: /Guardar visita/ }).waitFor();
await page.getByText("Sin cobertura · 1 visita en el móvil").waitFor();
await page.screenshot({ path: `${SALIDA}/15-arranque-sin-cobertura.png` });
// La copia local permite buscar clientes sin red
await page.getByPlaceholder("Buscar bar, restaurante…").fill("cobertura");
await page.getByRole("button", { name: /Bar Sin Cobertura E2E/ }).waitFor();

paso("Vuelve la cobertura → se sube sola");
await ctx.setOffline(false);
for (let i = 0; i < 40 && sql("select count(*) from visitas where notas = 'E2E: registrada sin cobertura'") !== "1"; i++) await page.waitForTimeout(300);
const nuevo = sql("select c.estado || '|' || c.tipo || '|' || c.telefono || '|' || p.email || '|' || (c.lat is not null) from clientes c join perfiles p on p.id = c.comercial_id where c.nombre_negocio = 'Bar Sin Cobertura E2E'");
console.log("  en BD:", nuevo);
assert.equal(nuevo, "interesado|pub|+34600009999|ana@demo.local|true");
await page.getByText(/en el móvil|sin subir|Subiendo/).waitFor({ state: "detached" });
await page.screenshot({ path: `${SALIDA}/16-sincronizado.png` });

// Deja la base como estaba
sql("delete from clientes where nombre_negocio = 'Bar Sin Cobertura E2E'");
sql("delete from visitas where notas like 'E2E:%'");

console.log(errores.length ? "ERRORES DE PÁGINA:\n" + errores.join("\n") : "Sin errores de página");
await navegador.close();
