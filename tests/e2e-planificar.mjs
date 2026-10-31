// Recorrido de la ruta automática: zonas, subir PDF de Holded, alta manual, calcular la mejor
// ruta, aceptarla y que le llegue al conductor. Requiere `npm run db:start` con datos demo y
// `npm run build && npm start`. Uso: CHROMIUM=/ruta node tests/e2e-planificar.mjs <carpeta-capturas>
import { createClient } from "@supabase/supabase-js";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { abrirNavegador, APP, entrar, paso, sql } from "./e2e-util.mjs";

const SALIDA = process.argv[2] ?? "capturas";
const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());

// Limpieza (sin triggers: las entregas registradas no se pueden borrar por diseño)
sql(`set session_replication_role = replica;
  delete from eventos_reparto; delete from paradas; delete from rutas; delete from albaranes; delete from destinos; delete from zonas_reparto;
  set session_replication_role = origin;
  update ajustes_logistica set almacen_lat = 39.4935, almacen_lng = -0.4290, almacen_direccion = 'Almacén de prueba', minutos_descarga = 10, hora_salida = '08:00', volver_almacen = true;
  insert into vehiculos (nombre, matricula, capacidad_bultos) select 'Furgoneta Plan', '9999PLN', 100 where not exists (select 1 from vehiculos where matricula = '9999PLN');`);
process.loadEnvFile(".env.local");
const almacen = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY).storage;
for (const b of ["albaranes", "entregas"]) {
  const { data } = await almacen.from(b).list();
  for (const f of data ?? []) {
    const { data: dentro } = await almacen.from(b).list(f.name);
    await almacen.from(b).remove(dentro?.length ? dentro.map((x) => `${f.name}/${x.name}`) : [f.name]);
  }
}
// Este entorno no llega a los mapas: se simula la ubicación de las direcciones
const ubicar = () =>
  sql(`update destinos set lat = v.lat, lng = v.lng, ubicacion_origen = 'direccion' from (values
    ('CALLE MAYOR, 10', 39.4747, -0.3764), ('AVENIDA DEL PUERTO, 200', 39.4590, -0.3330),
    ('CALLE SAN VICENTE, 50', 39.4651, -0.3790), ('Calle del Kiosko 3', 39.4800, -0.3700)) v(dir, lat, lng)
    where destinos.direccion = v.dir and destinos.lat is null`);

const { page, errores, navegador } = await abrirNavegador();

paso("La oficina crea la zona «Valencia Centro» para todos los días");
await entrar(page, "admin@demo.local");
await page.goto(`${APP}/logistica`);
await page.getByRole("link", { name: /Calcular ruta automática/ }).waitFor();
await page.screenshot({ path: `${SALIDA}/60-logistica.png`, fullPage: true });
await page.getByRole("link", { name: "Zonas y días de reparto" }).click();
await page.getByLabel("Nombre de la zona").fill("Valencia Centro");
for (const d of ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]) await page.getByLabel(d, { exact: true }).check({ force: true });
await page.getByRole("button", { name: "Guardar zona" }).click();
await page.getByText(/Lunes, Martes, Miércoles, Jueves, Viernes, Sábado, Domingo/).waitFor();
await page.screenshot({ path: `${SALIDA}/61-zonas.png`, fullPage: true });

paso("Sube dos PDF de Holded (uno con dos albaranes)");
await page.goto(`${APP}/logistica/albaranes`);
await page.waitForLoadState("networkidle"); // que la página haya cargado del todo antes de elegir los PDF
await page.getByLabel("Elegir PDF de albaranes").setInputFiles(["tests/fixtures/albaranes-holded-prueba.pdf", "tests/fixtures/albaran-holded-prueba-2.pdf"]);
await page.getByText("3 albaranes nuevos").waitFor({ timeout: 60_000 });
await page.screenshot({ path: `${SALIDA}/62-pdf-leidos.png`, fullPage: true });
assert.equal(sql("select count(*) from albaranes where estado = 'pendiente'"), "3");
assert.equal(sql("select ventana_hasta from destinos where nombre = 'BAR LA PLAZA DE PRUEBA S.L.'"), "10:00:00", "«antes de las 10» se entiende");
assert.equal(sql("select ventana_desde || '-' || ventana_hasta from destinos where nombre = 'CAFETERIA SOL DE PRUEBA'"), "08:00:00-11:00:00");
assert.equal(sql("select count(*) from destinos d join zonas_reparto z on z.id = d.zona_id where z.nombre = 'Valencia Centro'"), "3", "zona por el campo Ruta");
assert.equal(sql("select direccion from destinos where nombre = 'CAFETERIA SOL DE PRUEBA'"), "CALLE SAN VICENTE, 50", "sin envío usa la dirección del cliente");

paso("Subir otra vez el mismo PDF no duplica");
await page.getByLabel("Elegir PDF de albaranes").setInputFiles("tests/fixtures/albaran-holded-prueba-2.pdf");
await page.getByText("0 albaranes nuevos").waitFor({ timeout: 60_000 });
await page.getByText("Ya estaba importado: actualizado con esta lectura.").first().waitFor();
assert.equal(sql("select count(*) from albaranes"), "3");

paso("Alta manual de una entrega sin PDF");
await page.getByRole("button", { name: "Añadir entrega a mano" }).click();
await page.getByLabel("Cliente").fill("KIOSKO DE PRUEBA");
await page.getByLabel("Dirección de entrega").fill("Calle del Kiosko 3");
await page.getByLabel("Localidad").fill("Valencia");
await page.getByLabel("Horario prioritario (opcional)").fill("a partir de las 12");
await page.getByLabel("Productos (uno por línea)").fill("2 Caja agua\nHielo x3");
await page.getByRole("button", { name: "Añadir entrega" }).click();
await page.getByText(/Entrega para KIOSKO DE PRUEBA añadida/).waitFor();
assert.equal(sql("select ventana_desde from destinos where nombre = 'KIOSKO DE PRUEBA'"), "12:00:00");
await page.reload();
await page.waitForLoadState("networkidle");

paso("Zona a mano con el desplegable del albarán");
await page.getByText("Sin zona (1)").waitFor();
await page.getByLabel("Zona de KIOSKO DE PRUEBA").selectOption({ label: "Valencia Centro" });
for (let i = 0; i < 30 && sql("select coalesce(z.nombre, '') from destinos d left join zonas_reparto z on z.id = d.zona_id where d.nombre = 'KIOSKO DE PRUEBA'") !== "Valencia Centro"; i++) await page.waitForTimeout(300);
assert.equal(sql("select z.nombre from destinos d join zonas_reparto z on z.id = d.zona_id where d.nombre = 'KIOSKO DE PRUEBA'"), "Valencia Centro");

paso("Sin ubicación: se pega el enlace de Google Maps del sitio");
await page.getByText(/clientes? sin ubicación en el mapa/).waitFor();
await page.getByRole("button", { name: "Editar KIOSKO DE PRUEBA" }).click();
await page.getByPlaceholder("https://maps.app.goo.gl/… o 39.4699, -0.3763").fill("https://www.google.com/maps/place/Kiosko/@39.4800,-0.3700,17z/data=!3m1");
await page.getByRole("button", { name: "Guardar", exact: true }).click();
await page.getByText(/Ubicación fijada a mano/).waitFor();
assert.equal(sql("select lat || ',' || lng || ',' || ubicacion_origen from destinos where nombre = 'KIOSKO DE PRUEBA'"), "39.48,-0.37,manual");
ubicar();
await page.reload();
await page.getByText("Por repartir (4)").waitFor();
await page.screenshot({ path: `${SALIDA}/63-albaranes-pendientes.png`, fullPage: true });

paso("Planificar hoy: la zona del día ya viene marcada → calcular la mejor ruta");
await page.goto(`${APP}/logistica/planificar?fecha=${hoy}`);
await page.getByText("Entregas (4)").waitFor();
// Hoja de carga del día: la suma de los 4 albaranes, antes de calcular nada
await page.getByText("Hoja de carga del día (4 albaranes)").waitFor();
const filaCerveza = page.locator("tr", { hasText: "CERVEZA BARRIL 30L" }).first();
assert.equal((await filaCerveza.locator("td").nth(1).textContent()).trim(), "2");
await page.screenshot({ path: `${SALIDA}/64-planificar.png`, fullPage: true });
await page.getByRole("button", { name: "Calcular la mejor ruta" }).click();
await page.getByText("tiempo total").waitFor({ timeout: 60_000 });
await page.screenshot({ path: `${SALIDA}/65-ruta-calculada.png`, fullPage: true });
// Orden: la cafetería (8-11) y el bar (antes de las 10) antes que el kiosko (desde las 12)
const nombres = await page.locator("ol li p.font-medium").allTextContents();
console.log("  orden:", nombres.join(" → "));
assert.ok(nombres.indexOf("KIOSKO DE PRUEBA") > nombres.indexOf("BAR LA PLAZA DE PRUEBA S.L."), "el kiosko (desde las 12) va después del bar (antes de las 10)");
assert.equal(await page.getByText(/min tarde/).count(), 0, "se cumplen todos los horarios");
assert.equal(await page.locator(".leaflet-container").count(), 0, "sin mapa");

paso("Aceptar y enviar al conductor (Luis)");
await page.getByLabel("Conductor").selectOption({ label: "Luis (demo)" });
await page.getByRole("button", { name: "Aceptar y enviar al conductor" }).click();
await page.waitForURL(`**/logistica?fecha=${hoy}`);
const rutaId = sql("select id from rutas order by creado_at desc limit 1");
assert.equal(sql(`select count(*) from paradas where ruta_id = '${rutaId}' and llegada_prevista is not null`), "4");
assert.equal(sql("select count(*) from albaranes where estado = 'planificado'"), "4");
const llegadaBar = sql(`select llegada_prevista from paradas p join destinos d on d.id = p.destino_id where ruta_id = '${rutaId}' and d.nombre = 'BAR LA PLAZA DE PRUEBA S.L.'`);
assert.ok(llegadaBar < "10:00:00", `el bar llega antes de las 10 (${llegadaBar})`);
paso("PDF de la ruta: hoja de carga sumada y orden de reparto con horas");
await page.getByRole("link", { name: /Descargar PDF/ }).first().waitFor();
const respuesta = await page.request.get(`${APP}/api/logistica/rutas/${rutaId}/pdf`);
assert.equal(respuesta.status(), 200);
assert.equal(respuesta.headers()["content-type"], "application/pdf");
writeFileSync(`${SALIDA}/hoja-de-ruta.pdf`, await respuesta.body());
const texto = execFileSync("pdftotext", ["-layout", `${SALIDA}/hoja-de-ruta.pdf`, "-"]).toString();
assert.match(texto, /HOJA DE CARGA/);
assert.match(texto, /CERVEZA BARRIL 30L\s+2\b/);
assert.match(texto, /Caja agua\s+2\b/);
assert.match(texto, /ORDEN DE REPARTO/);
assert.match(texto, /Llegada \d{2}:\d{2}/);
assert.ok(texto.indexOf("BAR LA PLAZA DE PRUEBA") < texto.indexOf("KIOSKO DE PRUEBA"), "en el PDF, el bar antes que el kiosko");
console.log(texto.split("\n").slice(0, 16).join("\n"));
await page.goto(`${APP}/logistica/rutas/${rutaId}`);
await page.getByText(/Albarán SO900001/).waitFor();
await page.screenshot({ path: `${SALIDA}/66-ruta-oficina.png`, fullPage: true });
await page.goto(`${APP}/logistica/rutas/${rutaId}/carga`);
await page.getByText("CERVEZA BARRIL 30L").first().waitFor();

paso("El conductor la ve con la hora prevista y entrega el primero");
const movil = await abrirNavegador();
await entrar(movil.page, "luis@demo.local");
await movil.page.goto(`${APP}/reparto`);
await movil.page.getByText("Siguiente parada").waitFor();
await movil.page.getByText(/Llegada prevista \d{2}:\d{2}/).first().waitFor();
await movil.page.screenshot({ path: `${SALIDA}/67-conductor.png`, fullPage: true });
// Un toque (con confirmación): la firma va en el albarán de papel de Holded
movil.page.once("dialog", (d) => d.accept());
await movil.page.getByRole("button", { name: "Entregado", exact: true }).click();
await movil.page.getByText(/✓ .*: entregado/).waitFor();
for (let i = 0; i < 40 && sql("select count(*) from albaranes where estado = 'entregado'") !== "1"; i++) await movil.page.waitForTimeout(300);
assert.equal(sql("select count(*) from albaranes where estado = 'entregado'"), "1", "el albarán pasa a entregado");

assert.deepEqual([...errores, ...movil.errores], [], "sin errores en la consola");
await navegador.close();
await movil.navegador.close();
console.log("✓ Ruta automática: PDF de Holded → zonas → mejor ruta → conductor → entregado");
