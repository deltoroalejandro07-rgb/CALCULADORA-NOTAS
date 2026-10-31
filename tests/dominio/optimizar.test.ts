import { describe, expect, it } from "vitest";
import { matrizEstimada, optimizar, planEnOrden, type Matriz, type ParadaOpt } from "@/lib/dominio/optimizar";

// Paradas en una línea recta desde el almacén (0): A a 1 km, B a 2 km, C a 3 km, D a 4 km
function lineal(n: number, minutosPorKm = 2): Matriz {
  const pos = [0, ...Array.from({ length: n }, (_, i) => i + 1)];
  const dist = pos.map((a) => pos.map((b) => Math.abs(a - b) * 1000));
  const dur = pos.map((a) => pos.map((b) => Math.abs(a - b) * minutosPorKm * 60));
  return { dist, dur };
}
const p = (id: string, extra: Partial<ParadaOpt> = {}): ParadaOpt => ({ id, servicioMin: 10, desde: null, hasta: null, bultos: 1, ...extra });
const op = { salidaMin: 8 * 60, volverAlmacen: true };
const ids = (plan: ReturnType<typeof optimizar>, v = 0) => plan.rutas[v].paradas.map((x) => x.id);

describe("optimizar", () => {
  it("ordena por cercanía cuando no hay horarios (sale y vuelve por el camino más corto)", () => {
    // Llegan desordenadas: D, A, C, B
    const paradas = [p("D"), p("A"), p("C"), p("B")];
    // índices de la matriz: D=4km, A=1km, C=3km, B=2km → reordenamos la matriz a ese orden
    const posiciones = [0, 4, 1, 3, 2];
    const mm: Matriz = {
      dist: posiciones.map((a) => posiciones.map((b) => Math.abs(a - b) * 1000)),
      dur: posiciones.map((a) => posiciones.map((b) => Math.abs(a - b) * 120)),
    };
    const plan = optimizar(paradas, [{ id: "v1", capacidad: null }], mm, op);
    expect(["A,B,C,D", "D,C,B,A"]).toContain(ids(plan).join(","));
    expect(plan.totalM).toBe(8000); // 4 km ida + 4 km vuelta
    expect(plan.retrasos).toEqual([]);
    // Mejor que el orden de llegada
    const aMano = planEnOrden(paradas, { id: "v1", capacidad: null }, mm, op);
    expect(aMano.totalM).toBeGreaterThan(plan.totalM);
  });

  it("respeta el horario prioritario aunque no sea la más cercana", () => {
    // C (3 km) tiene que estar antes de las 8:10 → va la primera
    const paradas = [p("A"), p("B"), p("C", { hasta: 8 * 60 + 10 })];
    const plan = optimizar(paradas, [{ id: "v1", capacidad: null }], lineal(3), op);
    expect(ids(plan)[0]).toBe("C");
    expect(plan.retrasos).toEqual([]);
    expect(plan.rutas[0].paradas[0].llegada).toBe(8 * 60 + 6); // 3 km × 2 min
  });

  it("si una ventana abre más tarde, espera y lo cuenta", () => {
    const paradas = [p("A", { desde: 9 * 60 })];
    const plan = optimizar(paradas, [{ id: "v1", capacidad: null }], lineal(1), op);
    expect(plan.rutas[0].paradas[0]).toMatchObject({ llegada: 482, inicio: 540, espera: 58, retraso: 0 });
  });

  it("avisa cuando un horario es imposible de cumplir", () => {
    const paradas = [p("A", { hasta: 8 * 60 + 1 })]; // llegar a 1 km en 1 minuto: imposible
    const plan = optimizar(paradas, [{ id: "v1", capacidad: null }], lineal(1), op);
    expect(plan.retrasos).toEqual([{ id: "A", minutos: 1 }]);
  });

  it("reparte entre vehículos por capacidad", () => {
    const paradas = [p("A", { bultos: 6 }), p("B", { bultos: 6 }), p("C", { bultos: 6 })];
    const plan = optimizar(paradas, [{ id: "v1", capacidad: 12 }, { id: "v2", capacidad: 12 }], lineal(3), op);
    expect(plan.sobrecarga).toEqual([]);
    expect(plan.rutas.map((r) => r.bultos).sort((a, b) => a - b)).toEqual([6, 12]);
    expect(plan.rutas.flatMap((r) => r.paradas.map((x) => x.id)).sort()).toEqual(["A", "B", "C"]);
  });

  it("con un solo vehículo pequeño, lo hace pero avisa de la sobrecarga", () => {
    const plan = optimizar([p("A", { bultos: 8 }), p("B", { bultos: 8 })], [{ id: "v1", capacidad: 10 }], lineal(2), op);
    expect(plan.sobrecarga).toEqual([{ vehiculoId: "v1", bultos: 16, capacidad: 10 }]);
  });

  it("sin vuelta al almacén no cuenta el regreso", () => {
    const plan = optimizar([p("A")], [{ id: "v1", capacidad: null }], lineal(1), { ...op, volverAlmacen: false });
    expect(plan.totalM).toBe(1000);
  });

  it("es determinista y aguanta un día normal (30 paradas)", () => {
    const pts = [{ lat: 39.47, lng: -0.38 }, ...Array.from({ length: 30 }, (_, i) => ({ lat: 39.47 + Math.sin(i) * 0.05, lng: -0.38 + Math.cos(i * 1.7) * 0.05 }))];
    const m = matrizEstimada(pts);
    const paradas = pts.slice(1).map((_, i) => p(`P${i}`, i % 5 === 0 ? { hasta: 11 * 60 } : {}));
    const t0 = Date.now();
    const a = optimizar(paradas, [{ id: "v1", capacidad: null }], m, op);
    const b = optimizar(paradas, [{ id: "v1", capacidad: null }], m, op);
    expect(Date.now() - t0).toBeLessThan(5000);
    expect(ids(a)).toEqual(ids(b));
    expect(a.totalM).toBeLessThan(planEnOrden(paradas, { id: "v1", capacidad: null }, m, op).totalM);
  });
});

describe("matrizEstimada", () => {
  it("es simétrica, cero en la diagonal y más larga que la línea recta", () => {
    const m = matrizEstimada([{ lat: 39.47, lng: -0.38 }, { lat: 39.48, lng: -0.38 }]);
    expect(m.dist[0][0]).toBe(0);
    expect(m.dist[0][1]).toBeCloseTo(m.dist[1][0]);
    expect(m.dist[0][1]).toBeGreaterThan(1100); // ~1,11 km en línea recta × 1,3
    expect(m.dur[0][1]).toBeGreaterThan(60);
  });
});
