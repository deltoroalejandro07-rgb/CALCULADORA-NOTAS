import { describe, expect, it } from "vitest";
import { interpretarHorario, textoFranja } from "@/lib/dominio/horario";
import { leerAlbaranesHolded, leerNumero, type Fila } from "@/lib/logistica/holded-pdf";

// Misma estructura (posiciones x) que un PDF real de Holded, con datos inventados
const f = (...e: [number, string][]): Fila => e.map(([x, texto]) => ({ x, texto }));

function pagina({ numero = "SO000001", envio = true, horario = "", ruta = "", pag = "Pág. 1 de 1", lineas = true } = {}): Fila[] {
  return [
    f([404, `PEDIDO DE VENTA #${numero}`]),
    f([473, "Fecha: 30/10/2026"]),
    f([45, "Distribuidora Ejemplo, S.L."]),
    f([45, "B00000000"]),
    f([45, "Calle del Almacén 1"]),
    f([45, "Higueruelas (46162), Valencia, España"]),
    f([45, "info@ejemplo.com"]),
    f([45, "600000000"]),
    f([52, "Cliente:"], [331, "Dirección de envío:"]),
    f([52, "BAR EL EJEMPLO S.L."], ...(envio ? ([[331, "CALLE DE ENTREGA, 5"]] as [number, string][]) : [])),
    f([52, "B12345678"], ...(envio ? ([[331, "VALENCIA (46019), Valencia, España"]] as [number, string][]) : [])),
    f([52, "CALLE FISCAL, 21"]),
    f([52, "PATERNA (46980), Valencia, España"]),
    f([52, "963000000"]),
    f([49, "CONCEPTO"], [335, "PRECIO"], [381, "UNIDADES"], [430, "SUBTOTAL"], [496, "IVA"], [525, "TOTAL"]),
    ...(lineas
      ? [
          f([49, "ACEITE GIRASOL 25L"], [336, "47,27€"], [414, "1"], [441, "47,27€"], [493, "10%"], [519, "52,00€"]),
          f([49, "ACEITE REFINADO DE GIRASOL 25L"]),
          f([49, "AGUA 1,5L PACK 6"], [336, "2,10€"], [410, "12"], [441, "25,20€"], [493, "10%"], [519, "27,72€"]),
        ]
      : []),
    f([412, "BASE IMPONIBLE"], [521, "72,47€"]),
    f([450, "TOTAL"], [520, "79,72€"]),
    f([43, horario ? `Horario: ${horario}` : "Horario"]),
    f([43, ruta ? `Ruta ${ruta}` : "Ruta"]),
    f([279, pag]),
  ];
}

describe("leerAlbaranesHolded", () => {
  it("lee número, fecha, cliente, dirección de ENVÍO y líneas (sin el detalle)", () => {
    const [a] = leerAlbaranesHolded([pagina()]);
    expect(a).toMatchObject({
      numero: "SO000001",
      fecha: "2026-10-30",
      cliente: "BAR EL EJEMPLO S.L.",
      nif: "B12345678",
      telefono: "963000000",
      direccion: "CALLE DE ENTREGA, 5",
      localidad: "VALENCIA",
      codigo_postal: "46019",
      horario: null,
      ruta: null,
    });
    expect(a.lineas).toEqual([
      { descripcion: "ACEITE GIRASOL 25L", cantidad: 1 },
      { descripcion: "AGUA 1,5L PACK 6", cantidad: 12 },
    ]);
  });

  it("sin dirección de envío usa la del cliente", () => {
    const [a] = leerAlbaranesHolded([pagina({ envio: false })]);
    expect(a).toMatchObject({ direccion: "CALLE FISCAL, 21", localidad: "PATERNA", codigo_postal: "46980" });
  });

  it("lee los campos Horario y Ruta cuando vienen rellenos", () => {
    const [a] = leerAlbaranesHolded([pagina({ horario: "antes de las 10", ruta: "Valencia Norte" })]);
    expect(a.horario).toBe("antes de las 10");
    expect(a.ruta).toBe("Valencia Norte");
  });

  it("un PDF con varios albaranes y uno de dos páginas", () => {
    const p1 = pagina({ numero: "SO000002", pag: "Pág. 1 de 2" });
    const p2 = [f([404, "PEDIDO DE VENTA #SO000002"]), f([49, "CONCEPTO"], [335, "PRECIO"], [381, "UNIDADES"], [430, "SUBTOTAL"]), f([49, "CERVEZA BARRIL 30L"], [336, "90,00€"], [414, "3"], [441, "270,00€"]), f([279, "Pág. 2 de 2"])];
    const p3 = pagina({ numero: "SO000003" });
    const docs = leerAlbaranesHolded([p1, p2, p3]);
    expect(docs.map((d) => d.numero)).toEqual(["SO000002", "SO000003"]);
    expect(docs[0].lineas.map((l) => l.descripcion)).toEqual(["ACEITE GIRASOL 25L", "AGUA 1,5L PACK 6", "CERVEZA BARRIL 30L"]);
  });

  it("un PDF que no es de Holded no devuelve nada", () => {
    expect(leerAlbaranesHolded([[f([10, "Hola, esto es una carta"])]])).toEqual([]);
  });

  it("números en formato español", () => {
    expect(leerNumero("1")).toBe(1);
    expect(leerNumero("1,5")).toBe(1.5);
    expect(leerNumero("1.250")).toBe(1250);
    expect(leerNumero("10%")).toBeNull();
  });
});

describe("interpretarHorario", () => {
  it.each([
    ["antes de las 10", { desde: null, hasta: "10:00" }],
    ["Antes de las 10:30h", { desde: null, hasta: "10:30" }],
    ["hasta las 12", { desde: null, hasta: "12:00" }],
    ["de 8 a 11", { desde: "08:00", hasta: "11:00" }],
    ["8:00-11:30", { desde: "08:00", hasta: "11:30" }],
    ["entre las 9 y las 13", { desde: "09:00", hasta: "13:00" }],
    ["a partir de las 16", { desde: "16:00", hasta: null }],
    ["solo mañanas", { desde: "07:00", hasta: "13:00" }],
    ["por la tarde", { desde: "15:00", hasta: "20:00" }],
  ])("«%s»", (texto, esperado) => {
    expect(interpretarHorario(texto)).toEqual(esperado);
  });

  it("lo que no entiende devuelve null (la oficina lo fija a mano)", () => {
    expect(interpretarHorario("llamar antes")).toBeNull();
    expect(interpretarHorario("")).toBeNull();
    expect(interpretarHorario("de 11 a 8")).toBeNull();
  });

  it("texto corto de la franja", () => {
    expect(textoFranja("08:00", "11:00")).toBe("8:00-11:00");
    expect(textoFranja(null, "10:00")).toBe("antes de 10:00");
    expect(textoFranja("16:00", null)).toBe("desde 16:00");
  });
});
