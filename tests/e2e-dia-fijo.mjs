// El día de reparto elegido se queda fijo entre pantallas, y lo borrado se ve al momento (sin F5).
import assert from "node:assert/strict";
import { abrirNavegador, APP, entrar, paso, sql } from "./e2e-util.mjs";

const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());
const manana = new Date(Date.parse(hoy + "T12:00:00Z") + 864e5).toISOString().slice(0, 10);
const textoManana = (() => {
  const t = new Date(manana + "T12:00:00").toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Madrid" });
  return t.charAt(0).toUpperCase() + t.slice(1);
})();
sql(`update ajustes_logistica set almacen_lat = 39.49, almacen_lng = -0.42;
  insert into vehiculos (nombre, matricula) values ('F1', 'DIA1');
  insert into zonas_reparto (nombre, dias) values ('Z', '{1,2,3,4,5,6,7}');
  insert into destinos (nombre, clave, direccion, localidad, lat, lng, zona_id) values ('BAR DIA FIJO', 'df', 'Calle 1', 'Valencia', 39.47, -0.37, (select id from zonas_reparto limit 1));
  insert into albaranes (numero, destino_id, lineas) select 'DF1', id, '[]' from destinos where clave = 'df';`);

const { page, errores, navegador } = await abrirNavegador({ viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false });
await entrar(page, "admin@demo.local");

paso("Elijo «Mañana» y el día no se mueve al ir a Albaranes y a Calcular ruta");
await page.goto(`${APP}/logistica`);
await page.getByRole("link", { name: "Mañana", exact: true }).click();
await page.waitForURL(`**/logistica?fecha=${manana}`);
await page.getByRole("link", { name: /Ver o añadir albaranes/ }).click();
await page.getByText(`Reparto del ${textoManana}`).waitFor();
await page.getByRole("link", { name: /Calcular ruta/ }).first().click();
await page.getByText(`Reparto del ${textoManana}`).waitFor();
paso("Aunque entre desde el menú (sin fecha), sigue el día elegido");
await page.getByRole("link", { name: "Preparar reparto" }).click();
await page.getByText(/^Mañana, /).first().waitFor();
await page.goto(`${APP}/logistica/albaranes`);
await page.getByText(`Reparto del ${textoManana}`).waitFor();

paso("Borro todo y al volver al reparto ya no aparece (sin recargar)");
await page.getByText("BAR DIA FIJO").first().waitFor();
await page.getByRole("button", { name: /Borrar todo y empezar de cero/ }).last().click();
page.once("dialog", (d) => d.accept());
await page.getByRole("button", { name: "Borrar todo", exact: true }).click();
await page.getByText(/Todo listo para empezar/).waitFor();
assert.equal(await page.getByText("BAR DIA FIJO").count(), 0, "desaparece de la lista");
await page.getByRole("link", { name: "Volver al reparto" }).click();
await page.waitForURL(`**/logistica?fecha=${manana}`);
await page.getByRole("heading", { name: "Sube los albaranes del día" }).waitFor();
await page.getByRole("link", { name: "Subir PDF de Holded" }).waitFor();
assert.equal(await page.getByText(/^1 albarán$/).count(), 0, "el reparto ya no cuenta el albarán borrado");

paso("Volver a hoy");
await page.locator('a[href^="/logistica?fecha="]', { hasText: /^Hoy$/ }).click();
await page.waitForURL(`**/logistica?fecha=${hoy}`);
await page.goto(`${APP}/logistica/planificar`);
assert.equal(await page.getByText(`Reparto del ${textoManana}`).count(), 0, "ya no está en mañana");

assert.deepEqual(errores, [], "sin errores en la consola");
await navegador.close();
console.log("✓ Día fijo y cambios al momento");
