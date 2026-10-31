import { describe, expect, it } from "vitest";
import { clientesEnRiesgo, diasDeHorario, sugerirVisitas, type ClienteSugerible } from "@/lib/dominio/sugerencias";

const hoy = "2026-11-02"; // lunes
const base: ClienteSugerible = {
  id: "x",
  nombre_negocio: "Bar",
  estado: "prospecto",
  lat: null,
  lng: null,
  ultimo_resultado: null,
  ultimo_resultado_at: null,
  ultima_visita_at: "2026-10-30T10:00:00Z",
  proxima_accion: null,
  proxima_accion_fecha: null,
  horario_visita: null,
};
const c = (o: Partial<ClienteSugerible>) => ({ ...base, ...o });

describe("diasDeHorario", () => {
  it("entiende rangos y listas", () => {
    expect([...diasDeHorario("L-V 16:00-18:00")!]).toEqual([0, 1, 2, 3, 4]);
    expect([...diasDeHorario("S-D")!]).toEqual([5, 6]);
    expect([...diasDeHorario("L, X, V mañanas")!]).toEqual([0, 2, 4]);
    expect(diasDeHorario("por la tarde")).toBeNull();
  });
});

describe("sugerirVisitas", () => {
  it("prioriza lo vencido y explica por qué", () => {
    const r = sugerirVisitas(
      [
        c({ id: "frio" }),
        c({ id: "oferta", ultimo_resultado: "pide_oferta", ultimo_resultado_at: "2026-10-28T10:00:00Z" }),
        c({ id: "vencido", proxima_accion: "Llevar muestras", proxima_accion_fecha: "2026-10-29" }),
      ],
      hoy,
    );
    expect(r.map((s) => s.cliente.id)).toEqual(["vencido", "oferta"]);
    expect(r[0].motivos[0]).toBe("Seguimiento vencido hace 4 días: Llevar muestras");
    expect(r[1].motivos[0]).toBe("Pide oferta hace 5 días");
  });

  it("descarta a quien hoy no abre y sube a quien está cerca", () => {
    const vencido = { proxima_accion_fecha: "2026-11-01" };
    const r = sugerirVisitas(
      [c({ id: "finde", ...vencido, horario_visita: "S-D" }), c({ id: "cerca", ...vencido, lat: 39.47, lng: -0.376 }), c({ id: "normal", ...vencido })],
      hoy,
      { lat: 39.4705, lng: -0.3765 },
    );
    expect(r.map((s) => s.cliente.id)).toEqual(["cerca", "normal"]);
    expect(r[0].motivos).toContain("Te pilla cerca (70 m)");
  });

  it("no sugiere perdidos ni a quien no tiene nada pendiente", () => {
    expect(sugerirVisitas([c({ estado: "perdido", proxima_accion_fecha: "2026-10-01" }), c({})], hoy)).toEqual([]);
  });
});

describe("clientesEnRiesgo", () => {
  it("detecta clientes olvidados y ofertas sin respuesta", () => {
    const r = clientesEnRiesgo(
      [
        c({ id: "ok", estado: "cliente" }),
        c({ id: "olvidado", estado: "cliente", ultima_visita_at: "2026-08-01T10:00:00Z" }),
        c({ id: "oferta", estado: "interesado", ultimo_resultado: "pide_oferta", ultimo_resultado_at: "2026-10-15T10:00:00Z", ultima_visita_at: "2026-10-15T10:00:00Z" }),
        c({ id: "enfria", estado: "interesado", ultima_visita_at: "2026-10-05T10:00:00Z" }),
      ],
      hoy,
    );
    expect(r.map((x) => `${x.cliente.id}:${x.gravedad}`)).toEqual(["olvidado:alta", "oferta:alta", "enfria:media"]);
    expect(r[1].motivo).toBe("Pidió oferta hace 18 días y nadie ha vuelto");
  });
});
