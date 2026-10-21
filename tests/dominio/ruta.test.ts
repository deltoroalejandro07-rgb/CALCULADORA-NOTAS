import { describe, expect, it } from "vitest";
import { enlaceRutaGoogle, longitudRuta, ordenarRuta } from "@/lib/dominio/ruta";

// Cuatro puntos sobre una línea este-oeste (≈ 850 m entre cada uno)
const A = { id: "A", lat: 40.42, lng: -3.71 };
const B = { id: "B", lat: 40.42, lng: -3.7 };
const C = { id: "C", lat: 40.42, lng: -3.69 };
const D = { id: "D", lat: 40.42, lng: -3.68 };

describe("ordenarRuta", () => {
  it("va siempre al más cercano desde el inicio", () => {
    expect(ordenarRuta([C, A, D, B], { lat: 40.42, lng: -3.715 }).map((p) => p.id)).toEqual(["A", "B", "C", "D"]);
    expect(ordenarRuta([C, A, D, B], { lat: 40.42, lng: -3.675 }).map((p) => p.id)).toEqual(["D", "C", "B", "A"]);
  });
  it("sin inicio empieza por la primera parada", () => {
    expect(ordenarRuta([B, D, A, C]).map((p) => p.id)).toEqual(["B", "A", "C", "D"]);
  });
  it("no pierde ni duplica paradas", () => {
    expect(ordenarRuta([])).toEqual([]);
    expect(ordenarRuta([A])).toEqual([A]);
  });
  it("la ruta ordenada es más corta que la desordenada", () => {
    const inicio = { lat: 40.42, lng: -3.715 };
    expect(longitudRuta(ordenarRuta([C, A, D, B], inicio), inicio)).toBeLessThan(longitudRuta([C, A, D, B], inicio));
  });
});

describe("enlaceRutaGoogle", () => {
  it("última parada como destino y el resto como intermedias", () => {
    const url = new URL(enlaceRutaGoogle([A, B, C])!);
    expect(url.searchParams.get("destination")).toBe("40.42,-3.69");
    expect(url.searchParams.get("waypoints")).toBe("40.42,-3.71|40.42,-3.7");
  });
  it("una sola parada no lleva intermedias; vacía no da enlace", () => {
    expect(new URL(enlaceRutaGoogle([A])!).searchParams.has("waypoints")).toBe(false);
    expect(enlaceRutaGoogle([])).toBeNull();
  });
  it("como mucho 10 paradas", () => {
    const muchas = Array.from({ length: 15 }, (_, i) => ({ lat: 40, lng: -3 - i / 100 }));
    expect(new URL(enlaceRutaGoogle(muchas)!).searchParams.get("waypoints")!.split("|")).toHaveLength(9);
  });
});
