import { describe, expect, it } from "vitest";
import { claveDestino, diaSemana, elegirZona, leerLineasTexto } from "@/lib/dominio/destinos";

describe("claveDestino", () => {
  it("reconoce el mismo cliente escrito distinto", () => {
    expect(claveDestino("MOSSET AND GO SOCIEDAD LIMITADA.", "CALLE SANTA GENOVEVA TORRES, 21", "46019")).toBe(
      claveDestino("Mosset and Go", "C/ Santa Genoveva Torres 21", "46019"),
    );
  });
  it("distingue otra dirección del mismo cliente", () => {
    expect(claveDestino("Bar Pepe S.L.", "Calle Mayor 1", "46001")).not.toBe(claveDestino("Bar Pepe S.L.", "Calle Mayor 3", "46001"));
  });
});

describe("elegirZona", () => {
  const zonas = [
    { id: "1", nombre: "Valencia Norte" },
    { id: "2", nombre: "Aldaia" },
  ];
  it("por nombre exacto o aproximado", () => {
    expect(elegirZona("valencia norte", zonas)?.id).toBe("1");
    expect(elegirZona("Ruta Aldaia y Alaquàs", zonas)?.id).toBe("2");
    expect(elegirZona("", zonas)).toBeNull();
    expect(elegirZona("Castellón", zonas)).toBeNull();
  });
});

describe("leerLineasTexto", () => {
  it("entiende cantidades delante o detrás", () => {
    expect(leerLineasTexto("2 Barril 30L\nCaja tónica x3\nAgua\n1,5 kg café")).toEqual([
      { descripcion: "Barril 30L", cantidad: 2 },
      { descripcion: "Caja tónica", cantidad: 3 },
      { descripcion: "Agua", cantidad: 1 },
      { descripcion: "kg café", cantidad: 1.5 },
    ]);
  });
});

describe("diaSemana", () => {
  it("lunes = 1, domingo = 7", () => {
    expect(diaSemana("2026-11-02")).toBe(1);
    expect(diaSemana("2026-11-01")).toBe(7);
  });
});
