import { describe, expect, it } from "vitest";
import { diasNaturales, euros, fecha, fechaHora } from "@/lib/formato";

describe("formato España", () => {
  it("fecha dd/mm/aaaa, también para columnas date", () => {
    expect(fecha("2026-10-24")).toBe("24/10/2026");
    expect(fecha("2026-01-01T23:30:00Z")).toBe("02/01/2026"); // ya es día 2 en Madrid
    expect(fecha(null)).toBe("—");
  });
  it("fecha y hora en Madrid", () => {
    expect(fechaHora("2026-10-21T08:05:00Z")).toBe("21/10/2026, 10:05");
  });
  it("euros con coma decimal", () => {
    expect(euros(1234.5).replace(/\s/g, " ")).toBe("1234,50 €");
    expect(euros("297.5").replace(/\s/g, " ")).toBe("297,50 €");
  });
});

describe("diasNaturales (hora de Madrid)", () => {
  it("cuenta por días del calendario de Madrid, no por bloques de 24 h", () => {
    // 23:30 del 20 en Madrid (21:30Z) → 00:30 del 21 en Madrid (22:30Z): 1 día natural
    expect(diasNaturales("2026-10-20T21:30:00Z", "2026-10-20T22:30:00Z")).toBe(1);
    expect(diasNaturales("2026-10-20T08:00:00Z", "2026-10-20T20:00:00Z")).toBe(0);
    expect(diasNaturales("2026-10-14", "2026-10-21T10:00:00Z")).toBe(7);
  });
  it("cruza el cambio de hora sin desfases", () => {
    expect(diasNaturales("2026-10-24T10:00:00Z", "2026-10-26T10:00:00Z")).toBe(2);
  });
});
