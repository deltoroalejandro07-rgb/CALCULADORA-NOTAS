// Formatos de España: dd/mm/aaaa, 1.234,56 €, hora de Madrid.

const ZONA = "Europe/Madrid";

const fmtFecha = new Intl.DateTimeFormat("es-ES", { timeZone: ZONA, day: "2-digit", month: "2-digit", year: "numeric" });
const fmtFechaHora = new Intl.DateTimeFormat("es-ES", {
  timeZone: ZONA,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const fmtEuros = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

/** Las columnas `date` llegan como "2026-10-24": se leen como fecha local, sin desfase horario. */
function aFecha(valor: string | Date): Date {
  if (typeof valor === "string" && /^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    const [a, m, d] = valor.split("-").map(Number);
    return new Date(Date.UTC(a, m - 1, d, 12));
  }
  return new Date(valor);
}

export function fecha(valor: string | Date | null | undefined): string {
  return valor ? fmtFecha.format(aFecha(valor)) : "—";
}

export function fechaHora(valor: string | Date | null | undefined): string {
  return valor ? fmtFechaHora.format(aFecha(valor)) : "—";
}

export function euros(valor: number | string | null | undefined): string {
  return valor == null || valor === "" ? "—" : fmtEuros.format(Number(valor));
}
