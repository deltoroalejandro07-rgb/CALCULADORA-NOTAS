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
  insert into albaranes (numero, fecha, destino_id, lineas) select 'DF1', '${manana}', id, '[]' from destinos where clave = 'df';
  insert into destinos (nombre, clave, direccion, localidad, lat, lng, zona_id) values ('BAR DE HOY', 'dh', 'Calle 2', 'Valencia', 39.47, -0.37, (select id from zonas_reparto limit 1));
  insert into albaranes (numero, fecha, destino_id, lineas) select 'DH1', '${hoy}', id, '[]' from destinos where clave = 'dh';`);

const { page, errores, navegador } = await abrirNavegador({ viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false });
await entrar(page, "admin@demo.local");

paso("Elijo «Mañana» y el día no se mueve al ir a Albaranes y a Calcular ruta");
await page.goto(`${APP}/logistica`);
await page.getByRole("link", { name: "Mañana", exact: true }).click();
await page.waitForURL(`**/logistica?fecha=${manana}`);
await page.getByRole("link", { name: /Ver o añadir albaranes/ }).click();
await page.getByText(`Reparto del ${textoManana}`).waitFor();
await page.getByRole("link", { name: /Preparar ruta/ }).first().click();
await page.getByText(`Reparto del ${textoManana}`).waitFor();
paso("Aunque entre desde el menú (sin fecha), sigue el día elegido");
await page.getByRole("link", { name: "Preparar reparto" }).click();
await page.getByText(/^Mañana, /).first().waitFor();
await page.goto(`${APP}/logistica/albaranes`);
await page.getByText(`Reparto del ${textoManana}`).waitFor();

paso("Borro el reparto de mañana: se va su albarán, el de hoy se queda, y se ve al momento");
await page.getByText("BAR DIA FIJO").first().waitFor();
page.once("dialog", (d) => d.accept());
await page.getByRole("button", { name: "Borrar el reparto de mañana y empezar de cero" }).click();
await page.getByText(/1 albarán de ese día borrados\. Los demás días no se han tocado/).waitFor();
assert.equal(await page.getByText("BAR DIA FIJO").count(), 0, "desaparece de la lista sin recargar");
await page.getByText("BAR DE HOY").first().waitFor();
assert.equal(sql("select string_agg(numero, ',') from albaranes"), "DH1", "el de hoy sigue");
await page.getByRole("link", { name: "Volver al reparto" }).click();
await page.waitForURL(`**/logistica?fecha=${manana}`);
await page.getByText(/^1 albarán$/).waitFor();

paso("Volver a hoy");
await page.locator('a[href^="/logistica?fecha="]', { hasText: /^Hoy$/ }).click();
await page.waitForURL(`**/logistica?fecha=${hoy}`);
await page.goto(`${APP}/logistica/planificar`);
assert.equal(await page.getByText(`Reparto del ${textoManana}`).count(), 0, "ya no está en mañana");

assert.deepEqual(errores, [], "sin errores en la consola");
await navegador.close();
console.log("✓ Día fijo y cambios al momento");
