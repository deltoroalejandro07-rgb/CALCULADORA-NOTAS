// Agenda, «¿A quién visito hoy?», clientes en riesgo y previsión de pedidos.
// Requiere `npm run db:start` con datos demo y `npm run build && npm start`.
import assert from "node:assert/strict";
import { abrirNavegador, APP, entrar, paso, sql } from "./e2e-util.mjs";

const SALIDA = process.argv[2] ?? "capturas";
const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());
const haceDias = (n) => new Date(Date.parse(hoy + "T12:00:00Z") - n * 864e5).toISOString().slice(0, 10);
sql("delete from agenda");
// Que haya una sugerencia sea el día que sea (los horarios demo son de lunes a viernes)
sql(`update clientes set horario_visita = null, proxima_accion = 'Llevar muestras', proxima_accion_fecha = '${haceDias(3)}' where nombre_negocio = 'Bar Manolo'`);

const { page, errores, navegador } = await abrirNavegador();
paso("La comercial ve a quién visitar hoy y su agenda vacía");
await entrar(page, "ana@demo.local");
await page.getByRole("heading", { name: "¿A quién visito hoy?" }).waitFor();
await page.getByText("Seguimiento vencido hace 3 días: Llevar muestras").first().waitFor();
await page.getByText("Nada en la agenda para hoy. Pulsa para apuntar una reunión o una tarea.").waitFor();
await page.screenshot({ path: `${SALIDA}/70-hoy-sugerencias.png`, fullPage: true });

paso("Apunta una reunión con un cliente, una tarea y una nota");
await page.goto(`${APP}/agenda`);
await page.getByRole("button", { name: "Reunión" }).click();
await page.getByLabel("Título").fill("Reunión con el encargado");
await page.getByLabel("Empieza").fill("10:00");
await page.getByLabel("Termina").fill("09:00");
await page.getByLabel("Cliente (opcional)").selectOption({ label: "Bar Manolo" });
await page.getByRole("button", { name: "Guardar" }).click();
await page.getByRole("alert").getByText("La hora de fin es antes que la de inicio").waitFor();
await page.getByLabel("Termina").fill("11:00");
await page.getByLabel("Lugar").fill("Calle Mayor 1");
await page.getByRole("button", { name: "Guardar" }).click();
await page.getByRole("button", { name: /Reunión con el encargado/ }).first().waitFor();
await page.getByRole("button", { name: "Tarea", exact: true }).click();
await page.getByLabel("Título").fill("Llamar al proveedor de barriles");
await page.getByRole("button", { name: "Guardar" }).click();
await page.getByRole("button", { name: "Marcar «Llamar al proveedor de barriles» como hecha" }).click();
await page.getByRole("button", { name: "Marcar «Llamar al proveedor de barriles» como pendiente" }).waitFor();
await page.getByRole("button", { name: /^Notas/ }).click();
await page.getByRole("button", { name: "Nota", exact: true }).click();
await page.getByLabel("Título").fill("Ideas feria hostelería");
await page.getByLabel("Texto").fill("Llevar muestras de vermut y la tarifa nueva");
await page.getByRole("button", { name: "Guardar" }).click();
await page.getByLabel("Buscar en las notas").fill("vermut");
await page.getByRole("button", { name: /Ideas feria hostelería/ }).waitFor();
await page.screenshot({ path: `${SALIDA}/71-agenda-notas.png`, fullPage: true });
assert.equal(sql("select count(*) from agenda"), "3");
assert.equal(sql("select hecha from agenda where tipo = 'tarea'"), "t");

paso("La reunión sale en el panel Hoy");
await page.goto(`${APP}/hoy`);
await page.getByRole("link", { name: /10:00\s*Reunión con el encargado/ }).waitFor();

paso("Cada uno ve solo su agenda");
const otro = await abrirNavegador();
await entrar(otro.page, "luis@demo.local");
await otro.page.goto(`${APP}/agenda`);
await otro.page.getByText("Nada apuntado este día.").waitFor();
assert.equal(await otro.page.getByText("Reunión con el encargado").count(), 0);
await otro.navegador.close();

paso("Dirección: clientes en riesgo y previsión de pedidos");
sql(`update clientes set estado = 'cliente', ultima_visita_at = now() - interval '70 days' where nombre_negocio = 'Bodega Antigua'`);
sql(`delete from albaranes where numero like 'PRV%'; delete from destinos where nombre = 'BAR PREVISIÓN';
  insert into destinos (nombre, clave, telefono) values ('BAR PREVISIÓN', 'bar prevision', '600111222');
  insert into albaranes (numero, fecha, destino_id, estado) select 'PRV' || n, d::date, (select id from destinos where nombre = 'BAR PREVISIÓN'), 'entregado'
    from (values (1, '${haceDias(24)}'), (2, '${haceDias(17)}'), (3, '${haceDias(10)}')) v(n, d);`);
const admin = await abrirNavegador({ viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false, deviceScaleFactor: 1 });
await entrar(admin.page, "admin@demo.local");
await admin.page.goto(`${APP}/direccion`);
await admin.page.getByRole("heading", { name: "Clientes en riesgo" }).waitFor();
await admin.page.getByText(/Cliente sin visita desde hace 70 días/).waitFor();
await admin.page.screenshot({ path: `${SALIDA}/72-riesgo.png`, fullPage: true });
await admin.page.goto(`${APP}/logistica`);
await admin.page.getByText("BAR PREVISIÓN").waitFor();
await admin.page.getByText("Le toca pedir: suele pedir cada 7 días y hace 10").waitFor();
const wa = await admin.page.getByRole("link", { name: "WhatsApp a BAR PREVISIÓN" }).getAttribute("href");
assert.ok(wa.startsWith("https://wa.me/34600111222?text="), wa);
await admin.page.goto(`${APP}/agenda`);
await admin.page.getByText("Nada apuntado este día.").waitFor();
await admin.page.screenshot({ path: `${SALIDA}/73-agenda-pc.png` });
sql(`delete from albaranes where numero like 'PRV%'; delete from destinos where nombre = 'BAR PREVISIÓN'`);

assert.deepEqual([...errores, ...admin.errores], [], "sin errores en la consola");
await admin.navegador.close();
await navegador.close();
console.log("✓ Agenda, sugerencias, riesgo y previsión");
