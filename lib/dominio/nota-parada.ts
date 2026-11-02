// Nota de una parada para el repartidor. Si ese día se entrega en otra dirección, va en la primera
// línea como «Entregar en: …» (así no hace falta cambiar la base de datos ni la app del conductor).

const PREFIJO = "Entregar en: ";

export function unirNota(otraDireccion: string | null | undefined, nota: string | null | undefined): string | null {
  const partes: string[] = [];
  if (otraDireccion?.trim()) partes.push(PREFIJO + otraDireccion.trim().replace(/\s+/g, " "));
  if (nota?.trim()) partes.push(nota.trim());
  return partes.length ? partes.join("\n") : null;
}

export function partirNota(nota: string | null | undefined): { otraDireccion: string | null; texto: string | null } {
  if (!nota?.trim()) return { otraDireccion: null, texto: null };
  const [primera, ...resto] = nota.split("\n");
  if (primera.startsWith(PREFIJO)) return { otraDireccion: primera.slice(PREFIJO.length).trim() || null, texto: resto.join("\n").trim() || null };
  return { otraDireccion: null, texto: nota.trim() };
}

export const mapsDeDireccion = (direccion: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`;
