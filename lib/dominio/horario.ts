// Horarios de entrega escritos a mano ("antes de las 10", "de 8 a 11", "mañanas") → franja HH:MM.

export interface Franja {
  desde: string | null;
  hasta: string | null;
}

const sinTildes = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/** "10", "10:30", "10.30", "10h", "10 h" → "10:00" / "10:30". */
function hora(h: string, m?: string): string | null {
  const hh = Number(h);
  const mm = m ? Number(m) : 0;
  if (!Number.isInteger(hh) || hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

const H = String.raw`(\d{1,2})(?:[:.h](\d{2}))?\s*h?`;

/** Devuelve la franja o null si no se entiende (entonces se muestra el texto para que lo fije la oficina). */
export function interpretarHorario(texto: string | null | undefined): Franja | null {
  if (!texto?.trim()) return null;
  const t = sinTildes(texto).replace(/\s+/g, " ").trim();
  let m: RegExpMatchArray | null;

  if ((m = t.match(new RegExp(String.raw`(?:de|entre)?\s*(?:las\s*)?${H}\s*(?:a|-|y|hasta)\s*(?:las\s*)?${H}`)))) {
    const desde = hora(m[1], m[2]);
    const hasta = hora(m[3], m[4]);
    if (desde && hasta && desde < hasta) return { desde, hasta };
  }
  if ((m = t.match(new RegExp(String.raw`(?:antes de|hasta)\s*(?:las\s*)?${H}`)))) {
    const hasta = hora(m[1], m[2]);
    if (hasta) return { desde: null, hasta };
  }
  if ((m = t.match(new RegExp(String.raw`(?:a partir de|despues de|desde)\s*(?:las\s*)?${H}`)))) {
    const desde = hora(m[1], m[2]);
    if (desde) return { desde, hasta: null };
  }
  if (/\bmanana?s?\b|por la manana/.test(t) && !/tarde/.test(t)) return { desde: "07:00", hasta: "13:00" };
  if (/\btardes?\b/.test(t) && !/manana/.test(t)) return { desde: "15:00", hasta: "20:00" };
  return null;
}

/** "08:00"–"11:00" → "8:00-11:00"; solo "hasta" → "antes de 11:00". */
export function textoFranja(desde: string | null, hasta: string | null): string | null {
  const c = (h: string) => h.slice(0, 5).replace(/^0(\d)/, "$1");
  if (desde && hasta) return `${c(desde)}-${c(hasta)}`;
  if (hasta) return `antes de ${c(hasta)}`;
  if (desde) return `desde ${c(desde)}`;
  return null;
}

/** "08:30" → 510 minutos desde medianoche. */
export function aMinutos(h: string | null | undefined): number | null {
  if (!h) return null;
  const [hh, mm] = h.split(":").map(Number);
  return Number.isFinite(hh) && Number.isFinite(mm) ? hh * 60 + mm : null;
}

export function deMinutos(min: number): string {
  const m = Math.round(min);
  return `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}
