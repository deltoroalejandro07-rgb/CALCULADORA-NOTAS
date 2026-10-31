// Funciones de IA sin clave (el servidor de pruebas no tiene ANTHROPIC_API_KEY): deben funcionar en modo básico.
import assert from "node:assert/strict";
import { abrirNavegador, APP, entrar, paso, sql } from "./e2e-util.mjs";

const SALIDA = process.argv[2] ?? "capturas";
const { page, errores, navegador } = await abrirNavegador();

paso("Ficha: mensaje de seguimiento de plantilla, editable y con enlace a WhatsApp");
await entrar(page, "ana@demo.local");
const id = sql("select id from clientes where nombre_negocio = 'Bar Manolo'");
await page.goto(`${APP}/clientes/${id}`);
await page.getByRole("button", { name: "Redactar WhatsApp de seguimiento" }).click();
const caja = page.getByLabel("Texto del mensaje");
await page.getByText(/Mensaje de plantilla/).waitFor();
const texto = await caja.inputValue();
assert.match(texto, /soy Ana de dliverygo/);
await caja.fill(texto + " Gracias");
const enlace = await page.getByRole("link", { name: "Abrir en WhatsApp" }).getAttribute("href");
assert.ok(enlace.startsWith("https://wa.me/") && decodeURIComponent(enlace).endsWith("Gracias"), enlace);
await page.screenshot({ path: `${SALIDA}/74-seguimiento.png`, fullPage: true });

paso("La comercial no entra en «Pregúntale a tu CRM»");
await page.goto(`${APP}/asistente`);
await page.waitForURL("**/hoy");

paso("Dirección: resumen con cifras y aviso de activar la IA");
const admin = await abrirNavegador({ viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false, deviceScaleFactor: 1 });
await entrar(admin.page, "admin@demo.local");
await admin.page.goto(`${APP}/direccion`);
await admin.page.getByRole("button", { name: "Generar" }).click();
await admin.page.getByText(/^• Visitas: \d+/m).waitFor();
await admin.page.getByText("Resumen solo con cifras: con la IA activada se escribe con conclusiones y acciones.").waitFor();
await admin.page.screenshot({ path: `${SALIDA}/75-resumen.png` });
await admin.page.getByRole("link", { name: "Pregúntale a tu CRM" }).click();
await admin.page.getByText("Falta activar la IA").waitFor();
await admin.page.screenshot({ path: `${SALIDA}/76-asistente.png` });

assert.deepEqual([...errores, ...admin.errores], [], "sin errores en la consola");
await admin.navegador.close();
await navegador.close();
console.log("✓ IA en modo básico (sin clave)");
