import { describe, expect, it } from "vitest";
import { calcularTemperatura } from "@/lib/dominio/temperatura";
import type { EstadoCliente, ResultadoVisita } from "@/lib/dominio/tipos";

const HOY = new Date("2026-10-21T10:00:00+02:00");
const haceDias = (n: number) => new Date(HOY.getTime() - n * 86_400_000);
const c = (ultimo_resultado: ResultadoVisita | null, dias: number | null, estado: EstadoCliente = "interesado") => ({
  estado,
  ultimo_resultado,
  ultimo_resultado_at: dias == null ? null : haceDias(dias),
});

describe("calcularTemperatura", () => {
  it.each([
    ["pide_oferta", 0, "caliente"],
    ["interesado", 14, "caliente"],
    ["hace_pedido", 3, "caliente"],
    ["pide_oferta", 15, "templado"],
    ["interesado", 30, "templado"],
    ["pide_oferta", 31, "frio"],
    ["pide_info", 2, "templado"],
    ["pide_info", 30, "templado"],
    ["pide_info", 31, "frio"],
    ["sin_interes", 1, "frio"],
  ] as [ResultadoVisita, number, string][])("%s hace %i días → %s", (r, dias, esperado) => {
    expect(calcularTemperatura(c(r, dias), HOY)).toBe(esperado);
  });

  it("nunca visitado es frío", () => {
    expect(calcularTemperatura(c(null, null, "prospecto"), HOY)).toBe("frio");
  });

  it("un cliente perdido es frío aunque mostrara interés hace poco", () => {
    expect(calcularTemperatura(c("interesado", 1, "perdido"), HOY)).toBe("frio");
  });

  it("acepta fechas en texto ISO como las devuelve Supabase", () => {
    expect(calcularTemperatura({ estado: "interesado", ultimo_resultado: "pide_oferta", ultimo_resultado_at: haceDias(5).toISOString() }, HOY)).toBe("caliente");
  });
});
