// Paso 2: lista, filtros, mapa, ficha, edición y consentimiento.
// Uso: node tests/e2e-clientes.mjs <carpeta-capturas>
import assert from "node:assert/strict";
import { abrirNavegador, APP, entrar, paso, sql } from "./e2e-util.mjs";

const SALIDA = process.argv[2] ?? "capturas";
const { navegador, page, errores } = await abrirNavegador();

paso("Ana entra y abre Clientes");
await entrar(page, "ana@demo.local");
await page.goto(`${APP}/clientes`);
await page.getByText(/de \d+$/).waitFor();
const total = Number((await page.getByText(/de \d+$/).textContent()).match(/de (\d+)/)[1]);
assert.equal(String(total), sql("select count(*) from clientes c join perfiles p on p.id = c.comercial_id where p.email = 'ana@demo.local'"));
await page.screenshot({ path: `${SALIDA}/20-clientes-lista.png` });

paso("Búsqueda sin tildes y filtros");
await page.getByPlaceholder("Nombre, zona, contacto…").fill("lavapies");
const conLavapies = Number((await page.getByText(/de \d+$/).textContent()).match(/^(\d+)/)[1]);
assert.ok(conLavapies > 0 && conLavapies < total);
await page.getByPlaceholder("Nombre, zona, contacto…").fill("");
await page.getByRole("button", { name: "Filtros" }).click();
await page.getByRole("button", { name: "Interesado", exact: true }).click();
const interesados = Number((await page.getByText(/de \d+$/).textContent()).match(/^(\d+)/)[1]);
assert.equal(String(interesados), sql("select count(*) from clientes c join perfiles p on p.id = c.comercial_id where p.email = 'ana@demo.local' and c.estado = 'interesado'"));
await page.screenshot({ path: `${SALIDA}/21-clientes-filtros.png` });
await page.getByRole("button", { name: "Quitar filtros" }).click();
await page.getByRole("button", { name: "Filtros" }).click();

paso("Filtro rápido desde Hoy (?filtro=vencidos)");
await page.goto(`${APP}/clientes?filtro=vencidos`);
await page.getByRole("button", { name: /Quitar filtro Seguimiento vencido/ }).waitFor();
const vencidos = Number((await page.getByText(/de \d+$/).textContent()).match(/^(\d+)/)[1]);
assert.equal(
  String(vencidos),
  sql("select count(*) from clientes c join perfiles p on p.id = c.comercial_id where p.email = 'ana@demo.local' and c.estado <> 'perdido' and c.proxima_accion_fecha < (now() at time zone 'Europe/Madrid')::date"),
);

paso("Vista de mapa");
await page.goto(`${APP}/clientes`);
await page.getByRole("tab", { name: "Mapa" }).click();
await page.locator(".leaflet-container").waitFor();
await page.locator("path.leaflet-interactive").first().waitFor();
await page.waitForTimeout(1500); // teselas
await page.screenshot({ path: `${SALIDA}/22-clientes-mapa.png` });
await page.getByRole("tab", { name: "Lista" }).click();

paso("Ficha con historial");
const nombre = sql("select c.nombre_negocio from clientes c join perfiles p on p.id = c.comercial_id join visitas v on v.cliente_id = c.id where p.email = 'ana@demo.local' and c.telefono is not null group by c.nombre_negocio order by count(*) desc, c.nombre_negocio limit 1");
const clienteId = sql(`select id from clientes where nombre_negocio = '${nombre.replaceAll("'", "''")}'`);
await page.getByRole("link", { name: new RegExp(nombre) }).first().click();
await page.waitForURL(`**/clientes/${clienteId}`);
await page.getByRole("heading", { name: "Historial" }).waitFor();
await page.screenshot({ path: `${SALIDA}/23-ficha.png` });
await page.screenshot({ path: `${SALIDA}/24-ficha-completa.png`, fullPage: true });
assert.match(await page.getByRole("link", { name: "WhatsApp" }).getAttribute("href"), /^https:\/\/wa\.me\/34600/);
assert.match(await page.getByRole("link", { name: "Llamar" }).getAttribute("href"), /^tel:\+34600/);

paso("Editar: zona, horario y marcar perdido exige motivo");
await page.getByRole("link", { name: "Editar" }).click();
await page.getByLabel("Zona o barrio").fill("Lavapiés Norte");
await page.getByLabel("Mejor hora para visitar").fill("M-J 17:00-18:30");
await page.getByLabel("Estado").selectOption("perdido");
await page.getByRole("button", { name: "Guardar cambios" }).click();
assert.equal(await page.getByLabel("¿Por qué se ha perdido? *").evaluate((el) => el.validity.valueMissing), true);
assert.equal(await page.getByLabel("Zona o barrio").inputValue(), "Lavapiés Norte", "no se pierde lo escrito");
await page.getByLabel("¿Por qué se ha perdido? *").fill("Contrato en exclusiva con la competencia");
await page.getByRole("button", { name: "Guardar cambios" }).click();
await page.waitForURL(`**/clientes/${clienteId}`);
await page.getByText("Motivo: Contrato en exclusiva").waitFor();
assert.equal(sql(`select zona || '|' || horario_visita || '|' || estado from clientes where id = '${clienteId}'`), "Lavapiés Norte|M-J 17:00-18:30|perdido");

paso("Un comercial no ve el campo de comercial asignado ni puede borrar");
await page.getByRole("link", { name: "Editar" }).click();
assert.equal(await page.getByLabel("Comercial asignado").count(), 0);
assert.equal(await page.getByRole("button", { name: /Borrar cliente/ }).count(), 0);
await page.goto(`${APP}/clientes/${clienteId}`);

paso("Consentimiento por email queda en la ficha y en el historial");
const filaEmail = page.locator("div", { hasText: /^Email: / }).last();
await filaEmail.getByRole("button").click();
await page.getByPlaceholder(/Prueba \(opcional\)/).fill("Firmó la hoja de alta (E2E)");
await page.getByRole("button", { name: "Guardar" }).click();
await page.getByText("Email: acepta ofertas").waitFor();
await page.getByText(/Consentimiento email \(de palabra/).waitFor();
assert.equal(sql(`select consiente_email from clientes where id = '${clienteId}'`), "t");

assert.equal(await page.getByRole("link", { name: "Pedido" }).count(), 0, "sin catálogo: los pedidos se hacen en Holded");

paso("Exportación RGPD descarga un JSON con el historial");
const r = await page.request.get(`${APP}/api/rgpd/${clienteId}`);
assert.equal(r.status(), 200);
const json = await r.json();
assert.equal(json.cliente.id, clienteId);
assert.ok(json.visitas.length > 0 && json.consentimientos.length > 0);
const ajeno = sql("select c.id from clientes c join perfiles p on p.id = c.comercial_id where p.email = 'luis@demo.local' limit 1");
assert.equal((await page.request.get(`${APP}/api/rgpd/${ajeno}`)).status(), 404, "no debe exportar clientes de otro comercial");
await page.goto(`${APP}/clientes/${ajeno}`);
await page.getByText("No existe o no tienes acceso a esta página.").waitFor(); // RLS: la ficha de otro comercial no existe para Ana

paso("Cliente nuevo desde la lista");
await page.goto(`${APP}/clientes/nuevo`);
await page.getByLabel("Nombre del negocio *").fill("Cafetería Nueva E2E");
await page.getByLabel("Teléfono").fill("611 22 33 44");
await page.getByRole("button", { name: "Usar mi ubicación" }).click();
await page.getByText(/Guardada/).waitFor();
await page.getByRole("button", { name: "Crear cliente" }).click();
await page.waitForURL(/\/clientes\/[0-9a-f-]{36}$/);
await page.getByRole("heading", { name: /Cafetería Nueva E2E/ }).waitFor();
assert.equal(sql("select c.telefono || '|' || p.email || '|' || (c.lat is not null) from clientes c join perfiles p on p.id = c.comercial_id where c.nombre_negocio = 'Cafetería Nueva E2E'"), "+34611223344|ana@demo.local|true");

// Limpieza: deja la base como estaba
sql("delete from clientes where nombre_negocio = 'Cafetería Nueva E2E'");
console.log(errores.length ? "ERRORES DE PÁGINA:\n" + errores.join("\n") : "Sin errores de página");
await navegador.close();
