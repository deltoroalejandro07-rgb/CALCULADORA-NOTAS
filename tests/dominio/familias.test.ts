import { describe, expect, it } from "vitest";
import { agruparPorFamilia, familiaDe } from "@/lib/dominio/familias";

describe("familiaDe", () => {
  it.each([
    ["CERVEZA BARRIL 30L", "Cerveza"],
    ["Mahou 5 Estrellas tercio 33cl", "Cerveza"],
    ["Cerveza sin alcohol 0,0 lata", "Cerveza"],
    ["COCA-COLA ZERO 35CL CAJA 24", "Refrescos y zumos"],
    ["Tónica Schweppes 20cl", "Refrescos y zumos"],
    ["Zumo de naranja Granini 1L", "Refrescos y zumos"],
    ["AGUA 1,5L PACK 6", "Agua"],
    ["Agua con gas Vichy Catalan", "Agua"],
    ["Vino tinto Rioja crianza 75cl", "Vinos y cava"],
    ["Vermut rojo Martini", "Vinos y cava"],
    ["Ginebra Puerto de Indias 70cl", "Licores"],
    ["RON BARCELÓ AÑEJO", "Licores"],
    ["Whisky JB 1L", "Licores"],
    ["Café en grano mezcla 80/20 1kg", "Café e infusiones"],
    ["Leche entera brik 1L", "Lácteos"],
    ["ACEITE DE OLIVA VIRGEN EXTRA 5L", "Aceite y vinagre"],
    ["Patatas fritas bolsa 45g", "Alimentación"],
    ["Aceitunas rellenas de anchoa", "Alimentación"],
    ["Lejía 5L", "Limpieza"],
    ["Lavavajillas máquina 10L", "Limpieza"],
    ["Servilletas 30x30 2 capas", "Menaje y desechables"],
    ["Hielo en cubitos bolsa 2kg", "Congelados"],
    ["Botella CO2 10kg", "Envases y gas"],
    ["Producto raro sin pistas", "Otros"],
  ])("«%s» → %s", (desc, fam) => expect(familiaDe(desc)).toBe(fam));

  it("no confunde palabras dentro de otras (gin/original, ron/naranja)", () => {
    expect(familiaDe("Zumo naranja original")).toBe("Refrescos y zumos");
    expect(familiaDe("Bitter Kas original")).toBe("Refrescos y zumos");
  });
});

describe("agruparPorFamilia", () => {
  it("agrupa en orden fijo con el total de cada familia", () => {
    const g = agruparPorFamilia([
      { descripcion: "Lejía 5L", cantidad: 2 },
      { descripcion: "CERVEZA BARRIL 30L", cantidad: 3 },
      { descripcion: "Cerveza lata 33cl", cantidad: 24 },
      { descripcion: "Agua 1,5L", cantidad: 6 },
    ]);
    expect(g.map((x) => `${x.familia}:${x.total}`)).toEqual(["Cerveza:27", "Agua:6", "Limpieza:2"]);
    expect(g[0].lineas.map((l) => l.descripcion)).toEqual(["CERVEZA BARRIL 30L", "Cerveza lata 33cl"]);
  });
});
