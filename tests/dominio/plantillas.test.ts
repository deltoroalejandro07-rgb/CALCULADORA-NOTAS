import { describe, expect, it } from "vitest";
import { conBaja, rellenarPlantilla, TEXTO_BAJA_EMAIL, TEXTO_BAJA_WHATSAPP, variablesDesconocidas } from "@/lib/dominio/plantillas";

const datos = {
  contacto: "Paco Jiménez",
  negocio: "Bar El Rincón de Paco",
  comercial: "Ana",
  oferta: { titulo: "Arranque de barril", fecha_fin: "2026-11-20", productos: ["Cerveza lager barril", "CO2", "Grifo"] },
};

describe("rellenarPlantilla", () => {
  it("sustituye todas las variables", () => {
    expect(
      rellenarPlantilla("Hola {contacto}, soy {comercial}. Para {negocio}: {oferta} con {productos}, hasta el {fecha_fin}.", datos),
    ).toBe("Hola Paco, soy Ana. Para Bar El Rincón de Paco: Arranque de barril con Cerveza lager barril, CO2 y Grifo, hasta el 20/11/2026.");
  });
  it("sin contacto usa el nombre del negocio", () => {
    expect(rellenarPlantilla("Hola {contacto}", { ...datos, contacto: null })).toBe("Hola Bar El Rincón de Paco");
    expect(rellenarPlantilla("Hola {contacto}", { ...datos, contacto: "  " })).toBe("Hola Bar El Rincón de Paco");
  });
  it("sin oferta no deja huecos ni espacios antes de la puntuación", () => {
    expect(rellenarPlantilla("Gracias {contacto} {oferta}.", { ...datos, oferta: null })).toBe("Gracias Paco.");
  });
  it("un producto solo, sin «y»", () => {
    expect(rellenarPlantilla("{productos}", { ...datos, oferta: { ...datos.oferta, productos: ["Café"] } })).toBe("Café");
  });
  it("deja intactas las variables desconocidas y las detecta", () => {
    expect(rellenarPlantilla("Hola {nombre}", datos)).toBe("Hola {nombre}");
    expect(variablesDesconocidas("Hola {nombre}, {negocio} {telefono}")).toEqual(["nombre", "telefono"]);
    expect(variablesDesconocidas("Hola {contacto}")).toEqual([]);
  });
});

describe("conBaja (LSSI)", () => {
  it("añade el texto de baja según el canal", () => {
    expect(conBaja("Hola", "whatsapp")).toBe(`Hola\n\n${TEXTO_BAJA_WHATSAPP}`);
    expect(conBaja("Hola", "email")).toBe(`Hola\n\n${TEXTO_BAJA_EMAIL}`);
  });
  it("no lo duplica si la plantilla ya lo incluye", () => {
    const t = "Oferta.\n\nResponde BAJA si no quieres más.";
    expect(conBaja(t, "whatsapp")).toBe(t);
  });
});
