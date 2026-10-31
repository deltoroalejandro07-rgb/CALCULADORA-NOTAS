import { describe, expect, it } from "vitest";
import {
  cambiarCantidad,
  esEntregaParcial,
  leerImporte,
  lineasIniciales,
  moverParada,
  ordenCarga,
  progreso,
  siguienteParada,
  totalCarga,
  validarEntrega,
} from "@/lib/dominio/reparto";

const p = (id: string, orden: number, estado: "pendiente" | "entregada" | "fallida" = "pendiente") => ({ id, orden, estado });

describe("lineas de entrega", () => {
  it("empiezan con todo entregado y detectan la entrega parcial", () => {
    const l = lineasIniciales([{ producto_id: "a", descripcion: "Barril 30 L", cantidad: 2 }]);
    expect(l).toEqual([{ producto_id: "a", descripcion: "Barril 30 L", pedida: 2, entregada: 2 }]);
    expect(esEntregaParcial(l)).toBe(false);
    const menos = cambiarCantidad(l, 0, -1);
    expect(menos[0].entregada).toBe(1);
    expect(esEntregaParcial(menos)).toBe(true);
  });

  it("nunca baja de cero", () => {
    const l = lineasIniciales([{ producto_id: null, descripcion: "Caja", cantidad: 1 }]);
    expect(cambiarCantidad(cambiarCantidad(l, 0, -1), 0, -1)[0].entregada).toBe(0);
  });
});

describe("validarEntrega", () => {
  it("una entrega no pide firma (va en el albarán de papel)", () => {
    expect(validarEntrega({ estado: "entregada" })).toBeNull();
  });

  it("un fallo necesita motivo", () => {
    expect(validarEntrega({ estado: "fallida" })).toMatch(/motivo/);
    expect(validarEntrega({ estado: "fallida", motivo_fallo: "Cerrado" })).toBeNull();
  });

  it("un cobro necesita forma de pago", () => {
    expect(validarEntrega({ estado: "entregada", cobrado: 25 })).toMatch(/pagado/);
    expect(validarEntrega({ estado: "entregada", cobrado: 25, forma_cobro: "Efectivo" })).toBeNull();
    expect(validarEntrega({ estado: "entregada", cobrado: NaN })).toMatch(/importe/);
  });
});

describe("leerImporte", () => {
  it("entiende el formato español", () => {
    expect(leerImporte("12,50")).toBe(12.5);
    expect(leerImporte("1.250,00 €")).toBe(1250);
    expect(leerImporte("12.5")).toBe(12.5);
    expect(leerImporte("")).toBeNull();
    expect(leerImporte("abc")).toBeNaN();
  });
});

describe("orden de la ruta", () => {
  it("la siguiente parada salta las hechas, también las que aún están en el móvil", () => {
    const ps = [p("c", 3), p("a", 1, "entregada"), p("b", 2)];
    expect(siguienteParada(ps)?.id).toBe("b");
    expect(siguienteParada(ps, new Set(["b"]))?.id).toBe("c");
    expect(siguienteParada([p("a", 1, "fallida")])).toBeNull();
  });

  it("progreso cuenta entregadas, fallidas y hechas en el móvil", () => {
    expect(progreso([p("a", 1, "entregada"), p("b", 2, "fallida"), p("c", 3), p("d", 4)], new Set(["c"]))).toEqual({ hechas: 3, total: 4 });
  });

  it("mover una parada renumera", () => {
    const r = moverParada([p("a", 1), p("b", 2), p("c", 3)], "c", -1);
    expect(r.map((x) => `${x.id}${x.orden}`)).toEqual(["a1", "c2", "b3"]);
    expect(moverParada([p("a", 1), p("b", 2)], "a", -1).map((x) => x.id)).toEqual(["a", "b"]);
  });
});

describe("carga del camión", () => {
  const paradas = [
    { orden: 1, lineas: [{ producto_id: "x", descripcion: "Barril 30 L", cantidad: 2 }] },
    { orden: 2, lineas: [{ producto_id: "x", descripcion: "Barril 30 L", cantidad: 1 }, { producto_id: null, descripcion: "Caja tónica", cantidad: 3 }] },
  ];

  it("suma cada producto", () => {
    expect(totalCarga(paradas)).toEqual([
      { clave: "x", descripcion: "Barril 30 L", cantidad: 3 },
      { clave: "caja tónica", descripcion: "Caja tónica", cantidad: 3 },
    ]);
  });

  it("lo último que se entrega se carga primero", () => {
    expect(ordenCarga(paradas).map((x) => x.orden)).toEqual([2, 1]);
  });
});
