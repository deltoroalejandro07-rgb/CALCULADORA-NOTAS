// Corregir equivocaciones: deshacer un «Entregado»/«No entregado», pasarlo a otro día,
// volver a poner por repartir un albarán ya entregado y editar un albarán.
import assert from "node:assert/strict";
import { abrirNavegador, APP, entrar, paso, sql } from "./e2e-util.mjs";

const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());
const ayer = new Date(Date.parse(hoy + "T12:00:00Z") - 864e5).toISOString().slice(0, 10);
const admin = sql("select id from perfiles where email = 'admin@demo.local'");
sql(`insert into destinos (nombre, clave, direccion, localidad, lat, lng) values ('BAR DESHACER', 'bd', 'Calle 1', 'Valencia', 39.47, -0.37);
  insert into albaranes (numero, fecha, destino_id, lineas) select n, '${hoy}', (select id from destinos where clave = 'bd'), '[{"descripcion":"Agua","cantidad":6}]'
    from (values ('DS1'), ('DS2'), ('DS3'), ('DS4')) v(n);
  insert into rutas (fecha, conductor_id) values ('${hoy}', '${admin}');
  insert into rutas (fecha, conductor_id) values ('${ayer}', '${admin}');
  insert into paradas (ruta_id, orden, destino_id, albaran_id)
    select (select id from rutas where fecha = '${hoy}'), row_number() over (order by numero), destino_id, id from albaranes where numero in ('DS1', 'DS2', 'DS3');
  insert into paradas (ruta_id, orden, destino_id, albaran_id) select (select id from rutas where fecha = '${ayer}'), 1, destino_id, id from albaranes where numero = 'DS4';
  update paradas set estado = 'entregada', realizada_at = now(), entrega_id = gen_random_uuid() where albaran_id in (select id from albaranes where numero in ('DS1', 'DS4'));
  update paradas set estado = 'fallida', motivo_fallo = 'Cerrado', realizada_at = now() where albaran_id = (select id from albaranes where numero = 'DS2');`);
const estadoAlb = (n) => sql(`select estado from albaranes where numero = '${n}'`);
const estadoPar = (n) => sql(`select coalesce(string_agg(estado::text, ','), 'ninguna') from paradas where albaran_id = (select id from albaranes where numero = '${n}')`);
const esperar = async (f, valor, msg) => {
  for (let i = 0; i < 40 && f() !== valor; i++) await new Promise((r) => setTimeout(r, 250));
  assert.equal(f(), valor, msg);
};
assert.equal(estadoAlb("DS1"), "entregado");
assert.equal(estadoAlb("DS4"), "entregado");
const rutaHoy = sql(`select id from rutas where fecha = '${hoy}'`);

const { page, errores, navegador } = await abrirNavegador({ viewport: { width: 1280, height: 900 }, isMobile: false, hasTouch: false });
await entrar(page, "admin@demo.local");

paso("Oficina: deshago un «Entregado» marcado sin querer");
await page.goto(`${APP}/logistica/rutas/${rutaHoy}`);
const ds1 = page.locator("li", { hasText: "Albarán DS1" });
page.once("dialog", (d) => d.accept());
await ds1.getByRole("button", { name: "Deshacer (me equivoqué)" }).click();
await esperar(() => estadoPar("DS1"), "pendiente", "la parada vuelve a pendiente");
assert.equal(estadoAlb("DS1"), "planificado", "el albarán vuelve a contar (en ruta)");
assert.equal(sql(`select entrega_id is null and realizada_at is null from paradas where albaran_id = (select id from albaranes where numero = 'DS1')`), "t", "se limpia lo registrado");

paso("Deshago un «No entregado»");
page.once("dialog", (d) => d.accept());
await page.locator("li", { hasText: "Albarán DS2" }).getByRole("button", { name: "Deshacer (me equivoqué)" }).click();
await esperar(() => estadoPar("DS2"), "pendiente", "vuelve a pendiente en la ruta");
assert.equal(estadoAlb("DS2"), "planificado");
assert.equal(sql(`select estado from rutas where id = '${rutaHoy}'`), "planificada", "la ruta ya no está empezada");

paso("Paso DS3 a otro día: sale de la ruta y vuelve a «por repartir»");
sql(`update paradas set estado = 'entregada', realizada_at = now(), entrega_id = gen_random_uuid() where albaran_id = (select id from albaranes where numero = 'DS3')`);
await page.reload();
page.once("dialog", (d) => d.accept());
await page.locator("li", { hasText: "Albarán DS3" }).getByRole("button", { name: "Pasar a otro día (por repartir)" }).click();
await esperar(() => estadoPar("DS3"), "ninguna", "sale de la ruta");
assert.equal(estadoAlb("DS3"), "pendiente", "por repartir");

paso("Albaranes: uno ENTREGADO ayer vuelve a «por repartir» (y su ruta vacía se borra)");
await page.goto(`${APP}/logistica/albaranes`);
await page.getByRole("button", { name: /Entregados últimos 30 días \(1\)/ }).click();
await page.getByLabel("Buscar albarán entregado").fill("ds4");
page.once("dialog", (d) => d.accept());
await page.getByRole("button", { name: "No se entregó: volver a por repartir" }).click();
await page.getByText("✓ Listo: vuelve a estar «por repartir».").waitFor();
assert.equal(estadoAlb("DS4"), "pendiente");
assert.equal(sql(`select count(*) from rutas where fecha = '${ayer}'`), "0", "la ruta de ayer se queda vacía y se borra");

paso("Edito los productos de un albarán");
await page.reload();
await page.locator("li", { hasText: "DS4" }).getByRole("button", { name: "Editar albarán de BAR DESHACER" }).click();
await page.locator("li", { hasText: "DS4" }).locator('textarea[name="productos"]').fill("12 Agua 1,5L\n3 Coca-Cola");
await page.locator("li", { hasText: "DS4" }).getByRole("button", { name: "Guardar" }).click();
await page.getByText("✓ Albarán guardado.").waitFor();
assert.equal(sql(`select lineas::text from albaranes where numero = 'DS4'`), `[{"cantidad": 12, "descripcion": "Agua 1,5L"}, {"cantidad": 3, "descripcion": "Coca-Cola"}]`);

paso("Mi reparto: el repartidor deshace un «Entregado» ya subido");
sql(`update paradas set estado = 'entregada', realizada_at = now(), entrega_id = gen_random_uuid() where albaran_id = (select id from albaranes where numero = 'DS1')`);
await page.goto(`${APP}/reparto`);
await page.getByRole("button", { name: /BAR DESHACER.*Entregada/ }).first().click();
page.once("dialog", (d) => d.accept());
await page.getByRole("button", { name: "Deshacer: me he equivocado" }).click();
await page.getByText("↩ BAR DESHACER: vuelve a estar pendiente").waitFor();
assert.equal(estadoPar("DS1"), "pendiente");

assert.deepEqual(errores, [], "sin errores en la consola");
await navegador.close();
console.log("✓ Deshacer entregas y manejar albaranes");
