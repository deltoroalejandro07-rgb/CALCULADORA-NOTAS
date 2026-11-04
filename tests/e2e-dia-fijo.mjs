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

paso("Dos albaranes con el mismo nombre de cliente salen como dos pedidos separados");
sql(`insert into albaranes (numero, fecha, destino_id, lineas) select n, '${hoy}', (select id from destinos where clave = 'dh'), '[]' from (values ('DH2'), ('DH3')) v(n)`);
await page.goto(`${APP}/logistica/planificar?fecha=${hoy}`);
await page.getByText("Orden de entrega (3)").waitFor();
assert.equal(await page.locator("ol li p.font-medium", { hasText: "BAR DE HOY" }).count(), 3, "un albarán = una parada");
await page.getByLabel("Hora de BAR DE HOY (DH2)").waitFor();

paso("Se puede borrar un albarán que tuvo un «No entregado» (antes daba error)");
const ayer = new Date(Date.parse(hoy + "T12:00:00Z") - 864e5).toISOString().slice(0, 10);
sql(`insert into rutas (fecha) values ('${ayer}');
  insert into paradas (ruta_id, orden, destino_id, albaran_id) select (select id from rutas where fecha = '${ayer}' limit 1), 1, destino_id, id from albaranes where numero = 'DH2';
  update paradas set estado = 'fallida', motivo_fallo = 'Cerrado', realizada_at = now() where albaran_id = (select id from albaranes where numero = 'DH2');`);
assert.equal(sql("select estado from albaranes where numero = 'DH2'"), "pendiente", "vuelve a por repartir");
await page.goto(`${APP}/logistica/albaranes`);
page.once("dialog", (d) => d.accept());
await page.locator("li", { hasText: "DH2" }).getByRole("button", { name: "Borrar albarán de BAR DE HOY" }).click();
for (let i = 0; i < 30 && sql("select count(*) from albaranes where numero = 'DH2'") !== "0"; i++) await page.waitForTimeout(300);
assert.equal(sql("select count(*) from albaranes where numero = 'DH2'"), "0", "borrado");
assert.equal(sql(`select count(*) from rutas where fecha = '${ayer}'`), "0", "la ruta que quedó vacía también se borra");
await page.locator("li", { hasText: "DH2" }).waitFor({ state: "detached" });

paso("Al volver atrás a una pantalla ya vista, se ve lo nuevo (sin F5)");
await page.goto(`${APP}/logistica/planificar?fecha=${hoy}`);
await page.getByText("Orden de entrega (2)").waitFor();
await page.goto(`${APP}/logistica/albaranes`);
sql(`insert into albaranes (numero, fecha, destino_id, lineas) select 'DH9', '${hoy}', id, '[]' from destinos where clave = 'dh'`);
await page.goBack();
await page.getByText("Orden de entrega (3)").waitFor();
await page.getByLabel("Hora de BAR DE HOY (DH9)").waitFor();
paso("Y al volver a la app desde otra (WhatsApp, Maps)");
sql(`delete from albaranes where numero = 'DH9'`);
await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
await page.getByText("Orden de entrega (2)").waitFor();

assert.deepEqual(errores, [], "sin errores en la consola");
await navegador.close();
console.log("✓ Día fijo y cambios al momento");
