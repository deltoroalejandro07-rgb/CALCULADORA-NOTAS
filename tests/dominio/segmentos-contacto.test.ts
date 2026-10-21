import { describe, expect, it } from "vitest";
import { enlaceComoLlegar, enlaceEmail, enlaceLlamada, enlaceWhatsApp } from "@/lib/dominio/contacto";
import { ofertaEncaja, type PerfilCliente, type SegmentoOferta } from "@/lib/dominio/segmentos";

const HOY = "2026-10-21";
const base: SegmentoOferta = {
  fecha_inicio: "2026-10-01",
  fecha_fin: "2026-10-31",
  activa: true,
  segmento_tipos: [],
  segmento_zonas: [],
  segmento_estados: [],
  segmento_productos: [],
};
const bar: PerfilCliente = { tipo: "bar", zona: "Lavapiés", estado: "prospecto", intereses: ["cerveza-barril"] };

describe("ofertaEncaja", () => {
  it("sin criterios encaja con todos mientras esté vigente", () => {
    expect(ofertaEncaja(base, bar, HOY)).toBe(true);
  });
  it("fuera de fechas o inactiva no encaja", () => {
    expect(ofertaEncaja({ ...base, fecha_fin: "2026-10-20" }, bar, HOY)).toBe(false);
    expect(ofertaEncaja({ ...base, fecha_inicio: "2026-10-22" }, bar, HOY)).toBe(false);
    expect(ofertaEncaja({ ...base, activa: false }, bar, HOY)).toBe(false);
    expect(ofertaEncaja({ ...base, fecha_inicio: HOY, fecha_fin: HOY }, bar, HOY)).toBe(true);
  });
  it("tipo de negocio", () => {
    expect(ofertaEncaja({ ...base, segmento_tipos: ["bar", "pub"] }, bar, HOY)).toBe(true);
    expect(ofertaEncaja({ ...base, segmento_tipos: ["hotel"] }, bar, HOY)).toBe(false);
  });
  it("zona sin distinguir tildes ni mayúsculas; sin zona no encaja si la oferta filtra por zona", () => {
    expect(ofertaEncaja({ ...base, segmento_zonas: ["lavapies"] }, bar, HOY)).toBe(true);
    expect(ofertaEncaja({ ...base, segmento_zonas: ["Centro"] }, bar, HOY)).toBe(false);
    expect(ofertaEncaja({ ...base, segmento_zonas: ["Centro"] }, { ...bar, zona: null }, HOY)).toBe(false);
  });
  it("estado", () => {
    expect(ofertaEncaja({ ...base, segmento_estados: ["prospecto", "interesado"] }, bar, HOY)).toBe(true);
    expect(ofertaEncaja({ ...base, segmento_estados: ["cliente"] }, bar, HOY)).toBe(false);
  });
  it("productos: basta con que le interese uno", () => {
    expect(ofertaEncaja({ ...base, segmento_productos: ["vermut", "cerveza-barril"] }, bar, HOY)).toBe(true);
    expect(ofertaEncaja({ ...base, segmento_productos: ["vermut"] }, bar, HOY)).toBe(false);
  });
  it("todos los criterios a la vez", () => {
    const o = { ...base, segmento_tipos: ["bar" as const], segmento_estados: ["prospecto" as const], segmento_productos: ["cerveza-barril"] };
    expect(ofertaEncaja(o, bar, HOY)).toBe(true);
    expect(ofertaEncaja(o, { ...bar, estado: "cliente" }, HOY)).toBe(false);
  });
});

describe("enlaces de contacto", () => {
  it("WhatsApp sin + ni espacios y con +34 si falta", () => {
    expect(enlaceWhatsApp("+34 600 11 22 33")).toBe("https://wa.me/34600112233");
    expect(enlaceWhatsApp("600112233")).toBe("https://wa.me/34600112233");
    expect(enlaceWhatsApp("0034600112233")).toBe("https://wa.me/34600112233");
    expect(enlaceWhatsApp("+34600112233", "Hola ¿qué tal?")).toBe("https://wa.me/34600112233?text=Hola%20%C2%BFqu%C3%A9%20tal%3F");
  });
  it("llamada y email", () => {
    expect(enlaceLlamada("+34 600 11 22 33")).toBe("tel:+34600112233");
    expect(enlaceEmail("a@b.es")).toBe("mailto:a@b.es");
    expect(enlaceEmail("a@b.es", "Oferta café")).toBe("mailto:a@b.es?subject=Oferta%20caf%C3%A9");
  });
  it("cómo llegar: coordenadas, dirección o nada", () => {
    expect(enlaceComoLlegar({ lat: 40.4, lng: -3.7, direccion: null })).toContain("destination=40.4,-3.7");
    expect(enlaceComoLlegar({ lat: null, lng: null, direccion: "C/ Mayor 1", localidad: "Madrid" })).toContain("C%2F%20Mayor%201%2C%20Madrid");
    expect(enlaceComoLlegar({ lat: null, lng: null, direccion: null })).toBeNull();
  });
});
