// Textos y ayudas de la pantalla de entrada.

interface ErrorAuth {
  status?: number;
  code?: string;
  message: string;
}

/** Traduce los errores de Supabase al pedir el email de acceso. */
export function mensajeErrorAcceso(e: ErrorAuth): string {
  const espera = e.message.match(/after (\d+) seconds?/i)?.[1];
  if (espera) return `Espera ${espera} segundos antes de pedir otro email.`;
  if (e.status === 429 || /rate limit|too many/i.test(e.message) || e.code === "over_email_send_rate_limit") {
    return "Se ha alcanzado el límite de emails por hora. Usa el último email que te llegó o inténtalo más tarde.";
  }
  if (e.status === 422 || /signups not allowed|not found/i.test(e.message)) {
    return "Ese email no tiene acceso. Revisa que esté bien escrito o pide al administrador que te dé de alta.";
  }
  return "No se ha podido enviar el email. Inténtalo de nuevo en un momento.";
}

const DOMINIOS = ["gmail.com", "hotmail.com", "hotmail.es", "outlook.com", "outlook.es", "yahoo.com", "yahoo.es", "icloud.com", "live.com", "telefonica.net"];

function distancia(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

/** «x@gmail.con» → «x@gmail.com». Solo sugiere si el dominio está a 1-2 letras de uno habitual. */
export function sugerirEmail(email: string): string | null {
  const [usuario, dominio] = email.trim().toLowerCase().split("@");
  if (!usuario || !dominio || DOMINIOS.includes(dominio)) return null;
  let mejor: string | null = null;
  let menor = 3;
  for (const d of DOMINIOS) {
    const dist = distancia(dominio, d);
    if (dist < menor) {
      menor = dist;
      mejor = d;
    }
  }
  return mejor ? `${usuario}@${mejor}` : null;
}
