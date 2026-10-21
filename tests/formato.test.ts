import { describe, expect, it } from "vitest";
import { euros, fecha, fechaHora } from "@/lib/formato";

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
