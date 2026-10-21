import { distanciaMetros } from "./visita";

interface Punto {
  lat: number;
  lng: number;
}

/**
 * Ordena las paradas yendo siempre a la más cercana (vecino más próximo).
 * No es la ruta óptima, pero para 5-15 bares de un barrio es más que suficiente.
 */
export function ordenarRuta<T extends Punto>(paradas: T[], inicio?: Punto | null): T[] {
  const pendientes = [...paradas];
  const ruta: T[] = [];
  let actual: Punto | undefined = inicio ?? pendientes[0];
  while (pendientes.length) {
    let mejor = 0;
    for (let i = 1; i < pendientes.length; i++) {
      if (distanciaMetros(actual!, pendientes[i]) < distanciaMetros(actual!, pendientes[mejor])) mejor = i;
    }
    actual = pendientes.splice(mejor, 1)[0];
    ruta.push(actual as T);
  }
  return ruta;
}

/** Google Maps admite hasta 9 paradas intermedias en un enlace. Sale desde la ubicación actual. */
export const MAX_PARADAS_ENLACE = 10;

export function enlaceRutaGoogle(paradas: Punto[]): string | null {
  if (!paradas.length) return null;
  const p = paradas.slice(0, MAX_PARADAS_ENLACE);
  const destino = p[p.length - 1];
  const intermedias = p.slice(0, -1).map((x) => `${x.lat},${x.lng}`).join("|");
  const q = new URLSearchParams({ api: "1", destination: `${destino.lat},${destino.lng}`, travelmode: "driving" });
  if (intermedias) q.set("waypoints", intermedias);
  return `https://www.google.com/maps/dir/?${q.toString()}`;
}

export function longitudRuta(paradas: Punto[], inicio?: Punto | null): number {
  let total = 0;
  let previo = inicio ?? paradas[0];
  for (const p of paradas) {
    if (previo) total += distanciaMetros(previo, p);
    previo = p;
  }
  return total;
}
