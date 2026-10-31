import { describe, expect, it } from "vitest";
import { mensajeRutaConductor } from "@/lib/dominio/contacto";

describe("mensajeRutaConductor", () => {
  it("resume la ruta y enlaza a Mi reparto", () => {
    const t = mensajeRutaConductor({ conductor: "Luis García", cuando: "mañana", vehiculo: "Furgoneta 1", paradas: 12, salida: "08:00", url: "https://crm.ejemplo.es" });
    expect(t).toBe("Hola Luis 👋, ya tienes tu ruta de mañana con la Furgoneta 1: 12 paradas, salida a las 08:00.\nÁbrela aquí para ver el orden, las horas y marcar las entregas: https://crm.ejemplo.es/reparto");
    expect(mensajeRutaConductor({ conductor: "Ana", cuando: "hoy", vehiculo: null, paradas: 1, salida: null, url: "https://x" })).toMatch(/^Hola Ana 👋, ya tienes tu ruta de hoy: 1 parada\./);
  });
});
