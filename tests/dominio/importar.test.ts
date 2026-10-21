import { describe, expect, it } from "vitest";
import { adivinarMapeo, claveDuplicado, convertirFilas, interpretarEstado, interpretarImporte, interpretarSiNo, interpretarTipo } from "@/lib/dominio/importar";

describe("adivinarMapeo", () => {
  it("reconoce encabezados habituales con tildes, mayúsculas y signos", () => {
    expect(adivinarMapeo(["Establecimiento", "Teléfono Móvil", "E-mail", "Barrio", "C.P.", "Observaciones", "Columna rara"])).toEqual([
      "nombre_negocio",
      "telefono",
      "email",
      "zona",
      "codigo_postal",
      "notas",
      null,
    ]);
  });
  it("no asigna dos columnas al mismo campo", () => {
    expect(adivinarMapeo(["Nombre", "Nombre negocio"])).toEqual(["nombre_negocio", null]);
  });
  it("persona de contacto no se confunde con el nombre del negocio", () => {
    expect(adivinarMapeo(["Bar", "Persona de contacto"])).toEqual(["nombre_negocio", "contacto_nombre"]);
  });
});

describe("interpretaciones", () => {
  it.each([
    ["Cafetería", "cafeteria"],
    ["RESTAURANTE", "restaurante"],
    ["Mesón", "restaurante"],
    ["Hostal", "hotel"],
    ["Coctelería", "pub"],
    ["Cervecería", "bar"],
    ["", "bar"],
    ["Ferretería", "otro"],
  ])("tipo %s → %s", (e, s) => expect(interpretarTipo(e)).toBe(s));

  it("si no hay columna de tipo, lo deduce del nombre", () => {
    const [r] = convertirFilas([["Cafetería Luz"]], ["nombre_negocio"]);
    expect(r.datos?.tipo).toBe("cafeteria");
  });

  it.each([
    ["Cliente", "cliente"],
    ["activo", "cliente"],
    ["Interesado", "interesado"],
    ["pidió oferta", "interesado"],
    ["Perdido", "perdido"],
    ["", "prospecto"],
  ])("estado %s → %s", (e, s) => expect(interpretarEstado(e)).toBe(s));

  it("sí/no", () => {
    expect(["Sí", "si", "X", "1", true].every(interpretarSiNo)).toBe(true);
    expect(["No", "", "0", false, null].some(interpretarSiNo)).toBe(false);
  });

  it("importes en formato español", () => {
    expect(interpretarImporte("1.200,50 €")).toBe(1200.5);
    expect(interpretarImporte("1200.5")).toBe(1200.5);
    expect(interpretarImporte("1.500")).toBe(1500);
    expect(interpretarImporte("2.350.000")).toBe(2350000);
    expect(interpretarImporte("1,200")).toBe(1200);
    expect(interpretarImporte(850)).toBe(850);
    expect(interpretarImporte("")).toBeNull();
    expect(interpretarImporte("mucho")).toBeNull();
  });
});

describe("convertirFilas", () => {
  const mapeo = adivinarMapeo(["Nombre", "Tipo", "Teléfono", "Email", "CP", "Volumen", "Etiquetas", "Acepta WhatsApp"]);

  it("convierte y normaliza una fila completa", () => {
    const [r] = convertirFilas([["Bar Pepe", "Bar", "600 11 22 33", "PEPE@BAR.ES", 8001, "1.500", "terraza; menú", "sí"]], mapeo);
    expect(r).toMatchObject({
      fila: 2,
      datos: { nombre_negocio: "Bar Pepe", telefono: "+34600112233", email: "pepe@bar.es", codigo_postal: "08001", volumen_estimado_eur: 1500, etiquetas: ["terraza", "menú"], consiente_whatsapp: true, consiente_email: false },
    });
    expect(r.aviso).toBeUndefined();
  });

  it("sin nombre es un error; email mal escrito es un aviso", () => {
    const [sinNombre, emailMalo] = convertirFilas([["", "Bar"], ["Bar X", "", "", "esto-no-es-email"]], mapeo);
    expect(sinNombre.error).toBe("Sin nombre del negocio");
    expect(emailMalo.datos?.email).toBeNull();
    expect(emailMalo.aviso).toMatch(/email/);
  });
});

describe("claveDuplicado", () => {
  it("mismo negocio escrito distinto o mismo teléfono", () => {
    expect(claveDuplicado({ nombre_negocio: "Cafetería La Plaza", telefono: null })[0]).toBe(claveDuplicado({ nombre_negocio: "cafeteria la plaza.", telefono: null })[0]);
    expect(claveDuplicado({ nombre_negocio: "A", telefono: "600112233" })[1]).toBe(claveDuplicado({ nombre_negocio: "B", telefono: "+34 600 11 22 33" })[1]);
  });
});
