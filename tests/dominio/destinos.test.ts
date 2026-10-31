import { describe, expect, it } from "vitest";
import { claveDestino, diaSemana, elegirZona, leerCoordenadas, leerLineasTexto, limpiarDireccion, variantesDireccion } from "@/lib/dominio/destinos";

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

describe("direcciones para el mapa", () => {
  it("limpia los añadidos que confunden al buscador", () => {
    expect(limpiarDireccion("CAMINO CANAL, 91 - VALENCIA MAR, OFICINA 7")).toBe("CAMINO CANAL, 91");
    expect(limpiarDireccion("PASEO DE L'ALBEREDA, 48 - BJ 1")).toBe("PASEO DE L'ALBEREDA, 48");
    expect(limpiarDireccion("CALLE COLÓN 12, LOCAL 3")).toBe("CALLE COLÓN 12");
    expect(limpiarDireccion("CALLE SANTA GENOVEVA TORRES, 21")).toBe("CALLE SANTA GENOVEVA TORRES, 21");
  });

  it("prueba varias formas, de más precisa a más flexible", () => {
    expect(variantesDireccion("PASEO DE L'ALBEREDA, 48 - BJ 1", "46010", "VALENCIA")).toEqual([
      "PASEO DE L'ALBEREDA, 48, 46010 VALENCIA, España",
      "PASEO DE L'ALBEREDA, 48, VALENCIA, Valencia, España",
      "ALBEREDA, 48, 46010, VALENCIA",
    ]);
    expect(variantesDireccion(null, "46001", "Valencia")).toEqual([]);
  });

  it("lee coordenadas pegadas o enlaces de Google Maps", () => {
    expect(leerCoordenadas("39.4699, -0.3763")).toEqual({ lat: 39.4699, lng: -0.3763 });
    expect(leerCoordenadas("https://www.google.com/maps/place/Bar/@39.4747,-0.3764,17z/data=!3m1")).toEqual({ lat: 39.4747, lng: -0.3764 });
    expect(leerCoordenadas("https://www.google.com/maps/place/X/data=!4m6!3d39.4601!4d-0.3301")).toEqual({ lat: 39.4601, lng: -0.3301 });
    expect(leerCoordenadas("https://maps.google.com/?q=39.46,-0.37")).toEqual({ lat: 39.46, lng: -0.37 });
    expect(leerCoordenadas("Calle Mayor")).toBeNull();
    expect(leerCoordenadas("300, 500")).toBeNull();
  });
});
