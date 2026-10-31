// Optimizador de rutas de reparto: ventanas horarias, tiempo de descarga, capacidad y
// varios vehículos. Busca la ruta más rápida y con menos kilómetros a la vez.
// Puro y determinista: la matriz de tiempos/distancias la pone quien llama
// (OpenRouteService con perfil de camión, o una estimación si no hay clave).

export interface ParadaOpt {
  id: string;
  /** Minutos de descarga. */
  servicioMin: number;
  /** Ventana horaria en minutos desde medianoche (null = sin límite). */
  desde: number | null;
  hasta: number | null;
  bultos: number;
}

export interface VehiculoOpt {
  id: string;
  capacidad: number | null;
}

/** Índice 0 = almacén; índice i+1 = parada i. Segundos y metros. */
export interface Matriz {
  dur: number[][];
  dist: number[][];
}

export interface OpcionesOpt {
  /** Hora de salida del almacén, en minutos desde medianoche. */
  salidaMin: number;
  volverAlmacen: boolean;
}

export interface ParadaPlan {
  id: string;
  llegada: number; // minutos desde medianoche
  inicio: number; // empieza a descargar (puede esperar a que abra la ventana)
  espera: number;
  retraso: number; // minutos fuera de la ventana
}

export interface RutaPlan {
  vehiculoId: string;
  paradas: ParadaPlan[];
  fin: number;
  duracionMin: number;
  distanciaM: number;
  bultos: number;
}

export interface Plan {
  rutas: RutaPlan[];
  totalMin: number;
  totalM: number;
  /** Paradas que llegan tarde a su ventana (con el mejor orden posible). */
  retrasos: { id: string; minutos: number }[];
  /** Vehículos que superan su capacidad. */
  sobrecarga: { vehiculoId: string; bultos: number; capacidad: number }[];
}

// Pesos: 1 minuto de ruta ≈ 1 punto; 1 km ≈ 0,6 puntos (rápida Y económica). Llegar tarde
// o pasarse de carga pesa muchísimo más: solo ocurre si no hay otra forma.
const PESO_KM = 0.6;
const PESO_RETRASO = 1000;
const PESO_SOBRECARGA = 100_000;

interface Simulacion {
  coste: number;
  plan: RutaPlan;
}

function simular(ruta: number[], vehiculo: VehiculoOpt, paradas: ParadaOpt[], m: Matriz, op: OpcionesOpt): Simulacion {
  let t = op.salidaMin;
  let previo = 0;
  let distancia = 0;
  let retrasoTotal = 0;
  let bultos = 0;
  const plan: ParadaPlan[] = [];
  for (const i of ruta) {
    const p = paradas[i];
    const nodo = i + 1;
    t += m.dur[previo][nodo] / 60;
    distancia += m.dist[previo][nodo];
    const llegada = t;
    const inicio = p.desde != null ? Math.max(llegada, p.desde) : llegada;
    const retraso = p.hasta != null ? Math.max(0, inicio - p.hasta) : 0;
    plan.push({ id: p.id, llegada, inicio, espera: inicio - llegada, retraso });
    retrasoTotal += retraso;
    bultos += p.bultos;
    t = inicio + p.servicioMin;
    previo = nodo;
  }
  if (op.volverAlmacen && ruta.length) {
    t += m.dur[previo][0] / 60;
    distancia += m.dist[previo][0];
  }
  const duracion = ruta.length ? t - op.salidaMin : 0;
  const exceso = vehiculo.capacidad != null ? Math.max(0, bultos - vehiculo.capacidad) : 0;
  const coste = duracion + (distancia / 1000) * PESO_KM + retrasoTotal * PESO_RETRASO + exceso * PESO_SOBRECARGA;
  return { coste, plan: { vehiculoId: vehiculo.id, paradas: plan, fin: ruta.length ? t : op.salidaMin, duracionMin: duracion, distanciaM: distancia, bultos } };
}

const costeTotal = (rutas: number[][], vehiculos: VehiculoOpt[], paradas: ParadaOpt[], m: Matriz, op: OpcionesOpt) =>
  rutas.reduce((s, r, v) => s + simular(r, vehiculos[v], paradas, m, op).coste, 0);

function mejorInsercion(rutas: number[][], i: number, vehiculos: VehiculoOpt[], paradas: ParadaOpt[], m: Matriz, op: OpcionesOpt) {
  let mejor = { v: 0, pos: 0, delta: Infinity };
  rutas.forEach((r, v) => {
    const base = simular(r, vehiculos[v], paradas, m, op).coste;
    for (let pos = 0; pos <= r.length; pos++) {
      const prueba = [...r.slice(0, pos), i, ...r.slice(pos)];
      const delta = simular(prueba, vehiculos[v], paradas, m, op).coste - base;
      if (delta < mejor.delta - 1e-9) mejor = { v, pos, delta };
    }
  });
  return mejor;
}

/** Calcula el mejor reparto y orden de paradas entre los vehículos disponibles. */
export function optimizar(paradas: ParadaOpt[], vehiculos: VehiculoOpt[], m: Matriz, op: OpcionesOpt): Plan {
  if (!vehiculos.length) throw new Error("No hay vehículos");
  const rutas: number[][] = vehiculos.map(() => []);

  // 1. Construcción: primero las paradas con ventana más estrecha, cada una en su mejor hueco
  const orden = paradas
    .map((p, i) => ({ i, hasta: p.hasta ?? Infinity, lejos: m.dur[0][i + 1] }))
    .sort((a, b) => a.hasta - b.hasta || b.lejos - a.lejos)
    .map((x) => x.i);
  for (const i of orden) {
    const { v, pos } = mejorInsercion(rutas, i, vehiculos, paradas, m, op);
    rutas[v].splice(pos, 0, i);
  }

  // 2. Mejora: mover cada parada a su mejor sitio y dar la vuelta a tramos (2-opt) hasta que no mejore
  let coste = costeTotal(rutas, vehiculos, paradas, m, op);
  for (let vuelta = 0; vuelta < 50; vuelta++) {
    let mejorado = false;
    for (const i of paradas.map((_, k) => k)) {
      const v0 = rutas.findIndex((r) => r.includes(i));
      const p0 = rutas[v0].indexOf(i);
      rutas[v0].splice(p0, 1);
      const { v, pos } = mejorInsercion(rutas, i, vehiculos, paradas, m, op);
      rutas[v].splice(pos, 0, i);
      const nuevo = costeTotal(rutas, vehiculos, paradas, m, op);
      if (nuevo < coste - 1e-6) {
        coste = nuevo;
        mejorado = true;
      } else {
        rutas[v].splice(pos, 1);
        rutas[v0].splice(p0, 0, i);
      }
    }
    for (let v = 0; v < rutas.length; v++) {
      const r = rutas[v];
      for (let a = 0; a < r.length - 1; a++) {
        for (let b = a + 1; b < r.length; b++) {
          const prueba = [...r.slice(0, a), ...r.slice(a, b + 1).reverse(), ...r.slice(b + 1)];
          const antes = simular(r, vehiculos[v], paradas, m, op).coste;
          const despues = simular(prueba, vehiculos[v], paradas, m, op).coste;
          if (despues < antes - 1e-6) {
            rutas[v] = prueba;
            coste += despues - antes;
            mejorado = true;
            break;
          }
        }
      }
    }
    if (!mejorado) break;
  }

  return resumen(rutas, vehiculos, paradas, m, op);
}

function resumen(rutas: number[][], vehiculos: VehiculoOpt[], paradas: ParadaOpt[], m: Matriz, op: OpcionesOpt): Plan {
  const planes = rutas.map((r, v) => simular(r, vehiculos[v], paradas, m, op).plan);
  return {
    rutas: planes,
    totalMin: planes.reduce((s, p) => s + p.duracionMin, 0),
    totalM: planes.reduce((s, p) => s + p.distanciaM, 0),
    retrasos: planes.flatMap((p) => p.paradas.filter((x) => x.retraso > 0.5).map((x) => ({ id: x.id, minutos: Math.round(x.retraso) }))),
    sobrecarga: planes
      .map((p, v) => ({ vehiculoId: p.vehiculoId, bultos: p.bultos, capacidad: vehiculos[v].capacidad ?? Infinity }))
      .filter((x) => x.bultos > x.capacidad),
  };
}

/** El orden tal cual llegaron (un solo vehículo): sirve para enseñar cuánto se ahorra. */
export function planEnOrden(paradas: ParadaOpt[], vehiculo: VehiculoOpt, m: Matriz, op: OpcionesOpt): Plan {
  return resumen([paradas.map((_, i) => i)], [vehiculo], paradas, m, op);
}

// ---------- Estimación sin servicio de rutas ----------

export interface Punto {
  lat: number;
  lng: number;
}

function distanciaRecta(a: Punto, b: Punto): number {
  const R = 6_371_000;
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Matriz aproximada: distancia en línea recta × 1,3 (las calles no van rectas) y velocidad
 * media de furgoneta según el tramo (ciudad, cercanías, carretera).
 */
export function matrizEstimada(puntos: Punto[]): Matriz {
  const n = puntos.length;
  const dist = Array.from({ length: n }, () => Array<number>(n).fill(0));
  const dur = Array.from({ length: n }, () => Array<number>(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const d = distanciaRecta(puntos[i], puntos[j]) * 1.3;
      const kmh = d < 2_000 ? 18 : d < 10_000 ? 32 : 60;
      dist[i][j] = d;
      dur[i][j] = (d / 1000 / kmh) * 3600 + 60; // +1 min de aparcar/maniobrar
    }
  }
  return { dur, dist };
}
