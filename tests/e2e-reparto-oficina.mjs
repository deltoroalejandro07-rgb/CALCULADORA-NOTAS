// La oficina ve en «Mi reparto» las rutas de los repartidores y puede marcar entregas olvidadas.
import assert from "node:assert/strict";
import { abrirNavegador, APP, entrar, paso, sql } from "./e2e-util.mjs";

const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());
const otro = sql("select id from perfiles where email <> 'admin@demo.local' order by email limit 1");
const nombreOtro = sql(`select nombre from perfiles where id = '${otro}'`);
sql(`insert into destinos (nombre, clave, direccion, localidad) values ('BAR OLVIDADO', 'bo', 'Calle 3', 'Valencia');
  insert into albaranes (numero, fecha, destino_id, lineas) select 'OLV1', '${hoy}', id, '[{"descripcion":"Agua","cantidad":6}]' from destinos where clave = 'bo';
  insert into rutas (fecha, conductor_id) values ('${hoy}', '${otro}');
  insert into paradas (ruta_id, orden, destino_id, albaran_id) select (select id from rutas where fecha = '${hoy}'), 1, destino_id, id from albaranes where numero = 'OLV1';`);

const { page, errores, navegador } = await abrirNavegador();
await entrar(page, "admin@demo.local");

paso("La oficina ve la ruta del repartidor en Mi reparto");
await page.goto(`${APP}/reparto`);
await page.getByText(`Ruta de ${nombreOtro}`).waitFor();
await page.getByText("BAR OLVIDADO").first().waitFor();

paso("Y marca «Entregado» por él");
page.once("dialog", (d) => d.accept());
await page.getByRole("button", { name: "Entregado", exact: true }).click();
await page.getByText("✓ BAR OLVIDADO: entregado").waitFor();
for (let i = 0; i < 40 && sql("select estado from albaranes where numero = 'OLV1'") !== "entregado"; i++) await page.waitForTimeout(250);
assert.equal(sql("select estado from albaranes where numero = 'OLV1'"), "entregado", "se sube y cuenta como entregado");

assert.deepEqual(errores, [], "sin errores en la consola");
await navegador.close();
console.log("✓ La oficina controla las rutas de los repartidores");
