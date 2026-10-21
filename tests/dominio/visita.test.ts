import { describe, expect, it } from "vitest";
import {
  distanciaMetros,
  fechaDentroDe,
  normalizarTelefono,
  normalizarTexto,
  proximoLunes,
  siguienteMarca,
  SUGERENCIA_PROXIMA,
  textoDistancia,
} from "@/lib/dominio/visita";
import { RESULTADOS_VISITA } from "@/lib/dominio/tipos";

describe("próxima acción sugerida", () => {
  it("hay sugerencia para todo resultado salvo sin interés", () => {
    for (const r of RESULTADOS_VISITA) {
      if (r === "sin_interes") expect(SUGERENCIA_PROXIMA[r]).toBeNull();
      else expect(SUGERENCIA_PROXIMA[r]?.dias).toBeGreaterThan(0);
    }
  });
});

describe("fechas en Madrid", () => {
  it("suma días con la fecha de Madrid, no la UTC", () => {
    // 23:30 UTC del 21 = 01:30 del 22 en Madrid
    expect(fechaDentroDe(0, new Date("2026-10-21T23:30:00Z"))).toBe("2026-10-22");
    expect(fechaDentroDe(3, new Date("2026-10-21T10:00:00Z"))).toBe("2026-10-24");
  });
  it("próximo lunes", () => {
    expect(proximoLunes(new Date("2026-10-21T10:00:00Z"))).toBe("2026-10-26"); // miércoles
    expect(proximoLunes(new Date("2026-10-26T10:00:00Z"))).toBe("2026-11-02"); // lunes → el siguiente
    expect(proximoLunes(new Date("2026-10-25T10:00:00Z"))).toBe("2026-10-26"); // domingo
  });
});

describe("productos en la visita", () => {
  it("un toque presentado, dos interés, tres nada", () => {
    expect(siguienteMarca(undefined)).toBe("presentado");
    expect(siguienteMarca("presentado")).toBe("interes");
    expect(siguienteMarca("interes")).toBeUndefined();
  });
});

describe("teléfonos", () => {
  it.each([
    ["600 11 22 33", "+34600112233"],
    ["+34 600-112-233", "+34600112233"],
    ["0034600112233", "+34600112233"],
    ["912345678", "+34912345678"],
    ["+351912345678", "+351912345678"],
  ])("%s → %s", (entrada, esperado) => expect(normalizarTelefono(entrada)).toBe(esperado));
  it("rechaza basura", () => {
    expect(normalizarTelefono("12345")).toBeNull();
    expect(normalizarTelefono("")).toBeNull();
  });
});

describe("utilidades", () => {
  it("distancia aproximada (Sol → Plaza Mayor ≈ 450 m)", () => {
    const d = distanciaMetros({ lat: 40.4169, lng: -3.7035 }, { lat: 40.4155, lng: -3.7074 });
    expect(d).toBeGreaterThan(300);
    expect(d).toBeLessThan(500);
    expect(textoDistancia(d)).toMatch(/ m$/);
    expect(textoDistancia(2345)).toBe("2,3 km");
  });
  it("busca sin tildes", () => {
    expect(normalizarTexto("  Cafetería LUZ ")).toBe("cafeteria luz");
  });
});
