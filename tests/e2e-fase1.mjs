// Pasos 3 a 7: Hoy, usuarios, plantillas, campañas, dirección e importación (sin catálogo ni ofertas).
// Uso: node tests/e2e-fase1.mjs <carpeta-capturas>   (Supabase local con datos demo y la app en :3000)
import assert from "node:assert/strict";
import { abrirNavegador, APP, entrar, paso, sql } from "./e2e-util.mjs";

const SALIDA = process.argv[2] ?? "capturas";
const limpiar = () => {
  sql("delete from clientes where nombre_negocio like '%E2E%'");
  sql("delete from productos where nombre like '%E2E%'");
  sql("delete from ofertas where titulo like '%E2E%'");
  sql("delete from plantillas where nombre like '%E2E%'");
  sql("delete from mensajes where texto like '%E2E%'");
  sql("delete from auth.users where email like '%e2e@demo.local'");
};
limpiar();

const { navegador, ctx, page, errores } = await abrirNavegador();

// ---------------- Comercial ----------------
paso("Hoy (Ana): listas y ruta del día");
await entrar(page, "ana@demo.local");
await page.getByText("Seguimientos vencidos").waitFor();
await page.getByRole("heading", { name: /Ruta de visitas/ }).waitFor();
await page.getByRole("link", { name: /Toda la ruta en Google Maps/ }).waitFor();
const nav = await page.getByRole("link", { name: /Toda la ruta en Google Maps/ }).getAttribute("href");
assert.match(nav, /^https:\/\/www\.google\.com\/maps\/dir\/\?api=1&destination=/);
// Sin mapa propio: cada visita abre Google Maps
assert.equal(await page.locator(".leaflet-container").count(), 0);
await page.getByText("Ver las paradas en orden").click();
assert.match(await page.getByRole("link", { name: /^Abrir .* en Google Maps$/ }).first().getAttribute("href"), /^https:\/\/www\.google\.com\/maps\/dir\/\?api=1&destination=-?\d/);
await page.screenshot({ path: `${SALIDA}/30-hoy.png`, fullPage: true });
await page.getByRole("link", { name: /^Seguimientos vencidos\s*\d+$/ }).click();
await page.waitForURL("**/clientes?filtro=vencidos");

paso("Un comercial no entra en dirección ni en usuarios");
await page.goto(`${APP}/direccion`);
await page.waitForURL("**/hoy");
await page.goto(`${APP}/ajustes/usuarios`);
await page.waitForURL("**/hoy");

paso("Envío individual: cliente sin consentimiento → aviso, sin botón");
const sinConsentimiento = sql("select c.id from clientes c join perfiles p on p.id = c.comercial_id where p.email = 'ana@demo.local' and not c.consiente_whatsapp limit 1");
await page.goto(`${APP}/mensajes/enviar?cliente=${sinConsentimiento}`);
await page.getByText(/no ha dado su consentimiento/).waitFor();
assert.equal(await page.getByRole("link", { name: "Abrir WhatsApp" }).count(), 0);

paso("Campaña (Ana): mensaje general, sin ofertas");
await page.goto(`${APP}/mensajes/campana`);
await page.getByText(/con permiso para WhatsApp/).waitFor();
await page.screenshot({ path: `${SALIDA}/31-campana.png`, fullPage: true });
const antes = Number(sql("select count(*) from mensajes"));
const enlaceWa = await page.getByRole("link", { name: "WhatsApp" }).first().getAttribute("href");
assert.match(enlaceWa, /^https:\/\/wa\.me\/34\d{9}\?text=Hola%20/);
assert.match(decodeURIComponent(enlaceWa), /responde BAJA/);
assert.equal(await page.getByText("Oferta", { exact: true }).count(), 0, "sin selector de ofertas");
// Se abre en otra pestaña (aquí sin internet carga una página de error: da igual)
const [popup] = await Promise.all([ctx.waitForEvent("page"), page.getByRole("link", { name: "WhatsApp" }).first().click()]);
await popup.close();
await page.getByRole("link", { name: "Enviado" }).first().waitFor();
assert.equal(Number(sql("select count(*) from mensajes")), antes + 1);
assert.equal(sql("select (campana_id is not null) || '|' || estado || '|' || (texto like '%BAJA%') from mensajes order by creado_at desc limit 1"), "true|enviado|true");
await page.goto(`${APP}/mensajes`);
await page.getByText(/Enviado/).first().waitFor();
await page.screenshot({ path: `${SALIDA}/32-mensajes.png` });
await page.getByRole("link", { name: "Más" }).click();
await page.getByRole("button", { name: "Cerrar sesión" }).click();
await page.waitForURL("**/login");

// ---------------- Administrador ----------------
paso("Admin: alta de comercial, desactivar y reactivar");
await entrar(page, "admin@demo.local");
await page.goto(`${APP}/ajustes/usuarios`);
await page.getByLabel("Nombre").fill("Marta E2E");
await page.getByLabel("Email").fill("marta.e2e@demo.local");
await page.getByLabel("Contraseña").fill("corta");
await page.getByRole("button", { name: "Dar de alta" }).click();
assert.equal(await page.getByLabel("Contraseña").evaluate((el) => el.validity.tooShort), true);
await page.getByRole("button", { name: "Generar" }).click();
const contrasenaMarta = await page.getByLabel("Contraseña").inputValue();
assert.match(contrasenaMarta, /^[a-z]+\d{4}$/);
await page.getByRole("button", { name: "Dar de alta" }).click();
await page.getByText(/Marta E2E ya puede entrar/).waitFor();

paso("Marta entra con email y contraseña (otro navegador)");
{
  const otro = await abrirNavegador();
  await otro.page.goto(`${APP}/login`);
  await otro.page.getByLabel("Tu email").fill("marta.e2e@demo.local");
  await otro.page.getByLabel("Contraseña").fill("mal-contrasena");
  await otro.page.getByRole("button", { name: "Entrar", exact: true }).click();
  await otro.page.getByText(/Email o contraseña incorrectos/).waitFor();
  await otro.page.getByLabel("Contraseña").fill(contrasenaMarta);
  await otro.page.getByRole("button", { name: "Entrar", exact: true }).click();
  await otro.page.waitForURL("**/hoy");
  await otro.page.getByText("Hola, Marta").waitFor();
  // Cambia su propia contraseña desde Más
  await otro.page.goto(`${APP}/mas`);
  await otro.page.getByRole("button", { name: "Cambiar mi contraseña" }).click();
  await otro.page.getByLabel("Nueva contraseña").fill("nueva-clave-123");
  await otro.page.getByLabel("Repítela").fill("nueva-clave-123");
  await otro.page.getByRole("button", { name: "Guardar" }).click();
  await otro.page.getByText(/Contraseña cambiada/).waitFor();
  await otro.navegador.close();
}

paso("El admin le pone otra contraseña");
page.once("dialog", (d) => d.accept("otra-clave-456"));
await page.locator("li", { hasText: "marta.e2e@demo.local" }).getByRole("button", { name: "Cambiar contraseña" }).click();
await page.getByText(/Contraseña cambiada a «otra-clave-456»/).waitFor();
assert.equal(sql("select rol || '|' || activo from perfiles where email = 'marta.e2e@demo.local'"), "comercial|true");
page.once("dialog", (d) => d.accept());
await page.locator("li", { hasText: "marta.e2e@demo.local" }).getByRole("button", { name: "Desactivar" }).click();
await page.locator("li", { hasText: "marta.e2e@demo.local" }).getByText("Desactivado").waitFor();
assert.equal(sql("select (banned_until > now())::text from auth.users where email = 'marta.e2e@demo.local'"), "true");
await page.screenshot({ path: `${SALIDA}/33-usuarios.png` });

paso("El catálogo y las ofertas ya no existen");
for (const ruta of ["/catalogo", "/ofertas"]) assert.equal((await page.goto(`${APP}${ruta}`)).status(), 404, `${ruta} eliminado`);
await page.goto(`${APP}/mas`);
assert.equal(await page.getByRole("link", { name: /Catálogo|Ofertas/ }).count(), 0);

paso("Plantillas: variable inexistente → error; corregida → guardada");
await page.goto(`${APP}/mensajes/plantillas/nueva`);
await page.getByLabel("Nombre *").fill("Saludo E2E");
await page.locator("#cuerpo").fill("Hola {nombre}, soy {comercial}.");
await page.getByText("No existen: {nombre}").waitFor();
await page.locator("#cuerpo").fill("Hola {contacto}, soy {comercial}. Prueba E2E.");
await page.getByText(/Hola Paco, soy Dirección/).waitFor();
await page.getByRole("button", { name: "Crear plantilla" }).click();
await page.waitForURL("**/mensajes?tab=plantillas");
await page.getByText("Saludo E2E").waitFor();

paso("Panel de dirección");
await page.goto(`${APP}/direccion`);
await page.getByRole("heading", { name: "Visitas por comercial y semana" }).waitFor();
await page.screenshot({ path: `${SALIDA}/37-direccion.png`, fullPage: true });
await page.getByRole("button", { name: "Ver como tabla" }).click();
await page.getByRole("columnheader", { name: "Semana" }).waitFor();
const visitasTabla = await page.locator("table").first().locator("tbody tr td:last-child").allTextContents();
const totalTabla = visitasTabla.reduce((s, t) => s + Number(t), 0);
assert.equal(String(totalTabla), (await page.getByText("Visitas", { exact: true }).locator("..").locator("p").first().textContent()).trim());

paso("Importar CSV: 2 nuevos, 1 duplicado, 1 sin nombre");
await page.goto(`${APP}/ajustes/importar`);
await page.waitForLoadState("networkidle"); // que React haya enganchado el input antes de elegir fichero
await page.getByLabel("Fichero de clientes").setInputFiles("tests/fixtures/clientes.csv");
await page.getByText(/se importarán/).waitFor({ timeout: 8000 }).catch(async (e) => {
  console.log("PANTALLA:", (await page.locator("body").innerText()).slice(0, 1500), errores);
  throw e;
});
assert.match(await page.getByText(/se importarán/).textContent(), /2 se importarán · 1 con errores · 1 duplicados se saltan/);
await page.screenshot({ path: `${SALIDA}/38-importar.png`, fullPage: true });
await page.getByRole("button", { name: "Importar 2 clientes" }).click();
await page.getByText("2 clientes importados").waitFor();
assert.equal(sql("select string_agg(nombre_negocio || ':' || tipo || ':' || coalesce(volumen_estimado_eur::text,'-') || ':' || telefono, ',' order by nombre_negocio) from clientes where nombre_negocio like '%Importad%E2E'"), "Bar Nuevo Importado E2E:bar:1500.00:+34611000001,Cafetería Importada E2E:cafeteria:800.00:+34611000004");
assert.equal(sql("select count(*) from consentimientos k join clientes c on c.id = k.cliente_id where c.nombre_negocio like '%Importad%E2E'"), "0", "sin marcar la casilla no se importan consentimientos");

paso("Exportar Excel y CSV");
const xlsx = await page.request.get(`${APP}/api/exportar/clientes?formato=xlsx`);
assert.equal(xlsx.status(), 200);
assert.equal((await xlsx.body()).subarray(0, 2).toString(), "PK");
const csv = await (await page.request.get(`${APP}/api/exportar/clientes?formato=csv`)).text();
assert.match(csv, /^﻿Nombre del negocio;Tipo;Estado/);
assert.ok(csv.includes("Bar Nuevo Importado E2E;Bar;Prospecto"));

limpiar();
console.log(errores.length ? "ERRORES DE PÁGINA:\n" + errores.join("\n") : "Sin errores de página");
await navegador.close();
