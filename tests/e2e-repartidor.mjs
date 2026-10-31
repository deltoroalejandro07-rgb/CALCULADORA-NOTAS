// Rol repartidor: entra directo a Mi reparto y solo ve su parte.
import assert from "node:assert/strict";
import { abrirNavegador, APP, entrar, paso, sql } from "./e2e-util.mjs";

const SALIDA = process.argv[2] ?? "capturas";
sql("update perfiles set rol = 'repartidor' where email = 'luis@demo.local'");
try {
  const { page, errores, navegador } = await abrirNavegador();
  paso("El repartidor entra y va directo a Mi reparto");
  await entrar(page, "luis@demo.local").catch(() => {});
  await page.waitForURL("**/reparto");
  const barra = page.getByRole("navigation").last();
  for (const t of ["Mi reparto", "Historial", "Más"]) await barra.getByRole("link", { name: t }).waitFor();
  assert.equal(await barra.getByRole("link", { name: "Clientes" }).count(), 0, "no ve clientes");
  assert.equal(await page.getByRole("link", { name: "Registrar visita" }).count(), 0, "no registra visitas");
  await page.screenshot({ path: `${SALIDA}/77-repartidor.png`, fullPage: true });
  paso("En «Más» solo ve su reparto");
  await page.goto(`${APP}/mas`);
  await page.getByText("luis@demo.local · Repartidor").waitFor();
  assert.equal(await page.getByRole("link", { name: /Agenda/ }).count(), 0);
  await page.getByRole("link", { name: "Historial de rutas" }).waitFor();
  paso("La oficina le puede dar de alta como repartidor");
  const admin = await abrirNavegador();
  await entrar(admin.page, "admin@demo.local");
  await admin.page.goto(`${APP}/ajustes/usuarios`);
  assert.equal(await admin.page.getByLabel("Rol de Luis (demo)").inputValue(), "repartidor");
  await admin.page.getByRole("option", { name: "Repartidor (solo Mi reparto)" }).count();
  assert.deepEqual([...errores, ...admin.errores], [], "sin errores en la consola");
  await admin.navegador.close();
  await navegador.close();
  console.log("✓ Rol repartidor");
} finally {
  sql("update perfiles set rol = 'comercial' where email = 'luis@demo.local'");
}
