import { describe, expect, it } from "vitest";
import { mensajeLlegada, preverPedidos } from "@/lib/dominio/prevision";

const p = (destinoId: string, ...fechas: string[]) => fechas.map((fecha) => ({ destinoId, fecha }));

describe("preverPedidos", () => {
  it("avisa a quien ya debería haber pedido y a quien le toca pronto", () => {
    const r = preverPedidos(
      [
        ...p("semanal-retrasado", "2026-10-05", "2026-10-12", "2026-10-19"), // cada 7, último hace 14
        ...p("semanal-pronto", "2026-10-13", "2026-10-20", "2026-10-27"), // cada 7, último hace 6
        ...p("al-dia", "2026-10-25", "2026-10-28", "2026-10-31"), // cada 3, último hace 2 → pronto? no: -1
        ...p("pocos", "2026-10-01", "2026-10-08"),
      ],
      "2026-11-02",
    );
    expect(r.map((x) => `${x.destinoId}:${x.estado}`)).toEqual(["semanal-retrasado:toca", "semanal-pronto:pronto", "al-dia:pronto"]);
    expect(r[0]).toMatchObject({ cadaDias: 7, diasDesdeUltimo: 14, retrasoDias: 7, pedidos: 3 });
  });

  it("usa la mediana y olvida a quien dejó de pedir hace mucho", () => {
    const r = preverPedidos([...p("raro", "2026-09-01", "2026-09-08", "2026-09-15", "2026-10-20"), ...p("perdido", "2026-01-01", "2026-01-08", "2026-01-15")], "2026-10-30");
    expect(r.map((x) => x.destinoId)).toEqual(["raro"]);
    expect(r[0].cadaDias).toBe(7);
  });
});

describe("mensajeLlegada", () => {
  it("da la hora si aún no ha pasado", () => {
    const a = new Date("2026-11-02T08:00:00Z"); // 09:00 en Madrid
    expect(mensajeLlegada("dliverygo", "10:15", a)).toBe("Hola, somos dliverygo 🚚. Hoy te llevamos tu pedido: llegaremos sobre las 10:15. ¡Gracias!");
    expect(mensajeLlegada("dliverygo", "08:30", a)).toMatch(/en unos minutos/);
    expect(mensajeLlegada("dliverygo", null, a)).toMatch(/en unos minutos/);
  });
});
