import { describe, expect, it } from "vitest";
import { partirNota, unirNota } from "@/lib/dominio/nota-parada";

describe("nota de la parada", () => {
  it("guarda y recupera la otra dirección y la nota", () => {
    const n = unirNota("  Calle Nueva 5,  Valencia ", "Dejar en el almacén de atrás\ny cobrar");
    expect(n).toBe("Entregar en: Calle Nueva 5, Valencia\nDejar en el almacén de atrás\ny cobrar");
    expect(partirNota(n)).toEqual({ otraDireccion: "Calle Nueva 5, Valencia", texto: "Dejar en el almacén de atrás\ny cobrar" });
  });
  it("funciona con solo nota, solo dirección o nada", () => {
    expect(partirNota(unirNota(null, "Llamar antes"))).toEqual({ otraDireccion: null, texto: "Llamar antes" });
    expect(partirNota(unirNota("Plaza 1", ""))).toEqual({ otraDireccion: "Plaza 1", texto: null });
    expect(unirNota("", " ")).toBeNull();
    expect(partirNota(null)).toEqual({ otraDireccion: null, texto: null });
  });
});
