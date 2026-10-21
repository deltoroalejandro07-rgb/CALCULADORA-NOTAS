import { describe, expect, it } from "vitest";
import { siguienteEstado } from "@/lib/dominio/estado";
import { ESTADOS_CLIENTE, RESULTADOS_VISITA, type EstadoCliente, type ResultadoVisita } from "@/lib/dominio/tipos";

describe("siguienteEstado", () => {
  it("hace pedido convierte en cliente desde cualquier estado", () => {
    for (const e of ESTADOS_CLIENTE) expect(siguienteEstado(e, "hace_pedido")).toBe("cliente");
  });

  it.each([
    ["prospecto", "pide_oferta", "interesado"],
    ["prospecto", "interesado", "interesado"],
    ["perdido", "interesado", "interesado"],
    ["perdido", "pide_oferta", "interesado"],
    ["cliente", "pide_oferta", "cliente"],
    ["cliente", "interesado", "cliente"],
    ["interesado", "pide_oferta", "interesado"],
  ] as [EstadoCliente, ResultadoVisita, EstadoCliente][])("%s + %s → %s", (actual, resultado, esperado) => {
    expect(siguienteEstado(actual, resultado)).toBe(esperado);
  });

  it("sin interés, no estaba y pide información no cambian el estado", () => {
    for (const e of ESTADOS_CLIENTE)
      for (const r of ["sin_interes", "no_estaba", "pide_info"] as ResultadoVisita[]) expect(siguienteEstado(e, r)).toBe(e);
  });

  it("cubre todas las combinaciones sin lanzar errores", () => {
    for (const e of ESTADOS_CLIENTE) for (const r of RESULTADOS_VISITA) expect(ESTADOS_CLIENTE).toContain(siguienteEstado(e, r));
  });
});
