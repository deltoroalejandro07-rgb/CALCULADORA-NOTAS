// Recorrido de logística: la oficina planifica una ruta y el conductor entrega (sin firma: va en el albarán de papel),
// también sin cobertura. Requiere `npm run db:start` con datos demo y `npm run build && npm start`.
// Uso: CHROMIUM=/ruta node tests/e2e-reparto.mjs <carpeta-capturas>
import { createClient } from "@supabase/supabase-js";
import assert from "node:assert/strict";
import { abrirNavegador, APP, entrar, paso, sql } from "./e2e-util.mjs";

const SALIDA = process.argv[2] ?? "capturas";

// Limpieza de ejecuciones anteriores (las entregas registradas no se borran por diseño: sin triggers)
sql(
  "set session_replication_role = replica; delete from eventos_reparto; delete from paradas; delete from rutas; delete from albaranes; delete from destinos; delete from vehiculos where matricula = '1234E2E'; set session_replication_role = origin; update ajustes_logistica set almacen_lat = null, almacen_lng = null, almacen_direccion = null",
);
// Tres albaranes por repartir (como si se hubieran subido los PDF de Holded), cerca del almacén de prueba
sql(`with d as (
    insert into destinos (nombre, direccion, localidad, telefono, lat, lng, clave) values
      ('Bodega Antigua E2E', 'C/ Lavapiés 40', 'Madrid', '+34600000001', 40.4085, -3.7010, 'e2e-1'),
      ('Mesón El Hidalgo E2E', 'C/ Embajadores 50', 'Madrid', '+34600000002', 40.4060, -3.7030, 'e2e-2'),
      ('Taberna Los Arcos E2E', 'C/ Fuencarral 140', 'Madrid', '+34600000003', 40.4300, -3.7020, 'e2e-3')
    returning id, clave)
  insert into albaranes (numero, destino_id, lineas, origen)
  select 'SOE2E' || right(clave, 1), id, '[{"descripcion": "CERVEZA BARRIL 30L", "cantidad": 2}, {"descripcion": "AGUA 1,5L PACK 6", "cantidad": 3}]', 'manual' from d`);
process.loadEnvFile(".env.local");
const almacen = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY).storage.from("entregas");
for (const carpeta of (await almacen.list()).data ?? []) {
  const { data } = await almacen.list(carpeta.name);
  if (data?.length) await almacen.remove(data.map((f) => `${carpeta.name}/${f.name}`));
}

const oficina = await abrirNavegador({ serviceWorkers: "allow" });
const { page } = oficina;

paso("La oficina entra y abre «Preparar reparto» desde «Más»");
await entrar(page, "admin@demo.local");
await page.goto(`${APP}/mas`);
await page.getByRole("link", { name: "Preparar reparto" }).click();
await page.getByText("Antes de empezar (solo la primera vez)").waitFor();
await page.screenshot({ path: `${SALIDA}/40-logistica-vacia.png` });

paso("Almacén con la ubicación del móvil y alta de una furgoneta");
await page.getByRole("link", { name: "Marca dónde está tu almacén (punto de salida)" }).click();
await page.getByLabel("Dirección").fill("Polígono Las Mercedes, Madrid");
await page.getByRole("button", { name: /usar mi ubicación/ }).click();
await page.getByText(/Ubicación tomada/).waitFor();
await page.getByRole("button", { name: "Guardar almacén" }).click();
await page.getByText("✓ Almacén guardado.").waitFor();
await page.getByRole("button", { name: "Añadir vehículo" }).click();
await page.getByLabel("Nombre", { exact: true }).fill("Furgoneta 1");
await page.getByLabel("Matrícula").fill("1234 E2E");
await page.getByLabel("Carga máx. (kg)").fill("1500");
await page.getByLabel("Etiqueta ambiental (zonas de bajas emisiones)").selectOption("C");
await page.getByLabel("Conductor habitual").selectOption({ label: "Luis (demo)" });
await page.getByRole("button", { name: "Guardar", exact: true }).click();
await page.getByText("1234E2E").waitFor();
await page.screenshot({ path: `${SALIDA}/41-vehiculos.png`, fullPage: true });

paso("Nueva ruta para hoy con 3 albaranes por repartir, ordenada por cercanía");
await page.goto(`${APP}/logistica`);
await page.getByText("Más opciones").click();
await page.getByRole("button", { name: "Nueva ruta" }).click();
assert.equal(await page.locator("select[name=conductor_id]").inputValue(), sql("select id from perfiles where email = 'luis@demo.local'"), "pone el conductor habitual");
await page.getByRole("button", { name: "Crear y añadir paradas" }).click();
await page.waitForURL("**/logistica/rutas/**");
const rutaId = page.url().split("/").pop();
const casillas = page.locator('input[name="albaran"]');
for (let i = 0; i < 3; i++) await casillas.nth(i).check();
await page.getByRole("button", { name: "Añadir a la ruta (3)" }).click();
await page.getByText("✓ 3 paradas añadidas.").waitFor();
await page.getByRole("button", { name: "Ordenar por cercanía" }).click();
await page.waitForLoadState("networkidle");
assert.equal(sql(`select count(*) from paradas where ruta_id = '${rutaId}'`), "3");
await page.screenshot({ path: `${SALIDA}/42-ruta-oficina.png`, fullPage: true });

paso("Hoja de carga");
await page.getByRole("link", { name: "Hoja de carga" }).click();
await page.getByText("Total a cargar").waitFor();
await page.screenshot({ path: `${SALIDA}/43-hoja-carga.png`, fullPage: true });

paso("El conductor (Luis, comercial) abre «Mi reparto»");
const movil = await abrirNavegador({ serviceWorkers: "allow", geolocation: { latitude: 40.4168, longitude: -3.7038, accuracy: 12 } });
const c = movil.page;
await entrar(c, "luis@demo.local");
await c.goto(`${APP}/mas`);
await c.getByRole("link", { name: "Mi reparto" }).click();
await c.getByText("Siguiente parada").waitFor();
await c.getByText("0 de 3 paradas").waitFor();
await c.screenshot({ path: `${SALIDA}/44-reparto-conductor.png`, fullPage: true });

paso("El service worker guarda «Mi reparto» para abrirla sin red");
await c.evaluate(async () => (await navigator.serviceWorker.ready).active.postMessage("cachear-offline"));
for (let i = 0; i < 40; i++) {
  if (await c.evaluate(async () => !!(await caches.match("/reparto")))) break;
  await c.waitForTimeout(300);
}
assert.ok(await c.evaluate(async () => !!(await caches.match("/reparto"))), "reparto en caché");

paso("Sin cobertura: entrega con cambios (1 vacío recogido y cobro)");
await movil.ctx.setOffline(true);
const t0 = Date.now();
await c.getByRole("button", { name: /^Con cambios/ }).click();
await c.getByRole("button", { name: "Confirmar entrega" }).waitFor();
assert.equal(await c.getByText("Firma del cliente").count(), 0, "ya no se pide firma");
await c.getByRole("button", { name: "Más envases recogidos" }).click();
await c.getByLabel("Ha pagado ahora").check();
await c.getByLabel("Importe cobrado (€)").fill("45,50");
await c.getByRole("button", { name: "Efectivo" }).click();
await c.screenshot({ path: `${SALIDA}/45-entrega.png`, fullPage: true });
await c.getByRole("button", { name: "Confirmar entrega" }).click();
await c.getByText(/✓ Entrega en .* guardada/).waitFor();
console.log(`  entrega registrada en ${((Date.now() - t0) / 1000).toFixed(1)} s (automatizado)`);
await c.getByText("1 entrega guardada en el móvil: se subirán solas con cobertura").waitFor();
await c.getByText("1 de 3 paradas").waitFor();

paso("Sin cobertura: la segunda parada no se puede entregar (cerrado)");
await c.getByRole("button", { name: /^No entregado/ }).click();
await c.getByRole("button", { name: "Registrar: no entregada" }).click();
await c.getByRole("alert").getByText("Elige el motivo.").waitFor();
await c.getByRole("button", { name: "Cerrado" }).click();
await c.getByRole("button", { name: "Registrar: no entregada" }).click();
await c.getByText("2 entregas guardadas en el móvil: se subirán solas con cobertura").waitFor();
await c.screenshot({ path: `${SALIDA}/46-sin-cobertura.png`, fullPage: true });
assert.equal(sql(`select count(*) from paradas where ruta_id = '${rutaId}' and estado <> 'pendiente'`), "0", "sin red no ha llegado nada");

paso("Abrir la app en frío sin cobertura: lleva a la ruta y conserva lo hecho");
await c.goto(`${APP}/hoy`).catch(() => {});
await c.waitForURL("**/reparto");
await c.getByText("2 de 3 paradas").waitFor();
await c.getByText("2 entregas guardadas en el móvil: se subirán solas con cobertura").waitFor();
await c.screenshot({ path: `${SALIDA}/47-arranque-sin-cobertura.png`, fullPage: true });

paso("Vuelve la cobertura → se sube solo");
await movil.ctx.setOffline(false);
for (let i = 0; i < 60 && sql(`select count(*) from paradas where ruta_id = '${rutaId}' and estado <> 'pendiente'`) !== "2"; i++) await c.waitForTimeout(300);
const entregada = sql(
  `select p.estado || '|' || p.envases_recogidos || '|' || p.cobrado || '|' || p.forma_cobro || '|' || (p.firma_path is null) || '|' || (p.lat is not null) from paradas p where ruta_id = '${rutaId}' and estado = 'entregada'`,
);
console.log("  en BD:", entregada);
assert.equal(entregada, "entregada|1|45.50|Efectivo|true|true");
assert.equal(sql(`select motivo_fallo from paradas where ruta_id = '${rutaId}' and estado = 'fallida'`), "Cerrado");
assert.equal(sql(`select estado from rutas where id = '${rutaId}'`), "en_curso");
await c.getByText(/guardadas? en el móvil/).waitFor({ state: "detached" });
await c.screenshot({ path: `${SALIDA}/48-subido.png`, fullPage: true });

paso("La oficina ve la entrega y el albarán");
await page.goto(`${APP}/logistica/rutas/${rutaId}`);
await page.getByText(/Entregada .*1 envases recogidos · cobrado/).waitFor();
await page.getByText(/No entregada: Cerrado/).waitFor();
await page.screenshot({ path: `${SALIDA}/49-ruta-con-entregas.png`, fullPage: true });
await page.getByRole("link", { name: "Ver albarán" }).first().click();
await page.getByText("Albarán de entrega").waitFor();
await page.screenshot({ path: `${SALIDA}/50-albaran.png`, fullPage: true });

paso("El albarán entregado queda entregado; el que falló vuelve a «por repartir»");
assert.equal(sql(`select a.estado from albaranes a join paradas p on p.albaran_id = a.id where p.ruta_id = '${rutaId}' and p.estado = 'fallida'`), "pendiente");
assert.equal(sql(`select a.estado from albaranes a join paradas p on p.albaran_id = a.id where p.ruta_id = '${rutaId}' and p.estado = 'entregada'`), "entregado");

const errores = [...oficina.errores, ...movil.errores];
assert.deepEqual(errores, [], "sin errores en la consola");
await oficina.navegador.close();
await movil.navegador.close();
console.log("✓ Logística: planificar, entregar sin cobertura y ver el albarán");
