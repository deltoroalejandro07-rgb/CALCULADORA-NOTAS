// Enlaces que abren el teléfono, WhatsApp, el correo o el mapa del móvil.

export function enlaceLlamada(telefono: string): string {
  return `tel:${telefono.replace(/[^\d+]/g, "")}`;
}

/** wa.me exige el número sin "+" ni espacios. Un móvil español sin prefijo se asume +34. */
export function enlaceWhatsApp(telefono: string, texto?: string): string {
  let n = telefono.replace(/\D/g, "");
  if (n.startsWith("00")) n = n.slice(2);
  if (/^[67]\d{8}$/.test(n)) n = "34" + n;
  return `https://wa.me/${n}${texto ? `?text=${encodeURIComponent(texto)}` : ""}`;
}

export function enlaceEmail(email: string, asunto?: string, cuerpo?: string): string {
  const q = new URLSearchParams();
  if (asunto) q.set("subject", asunto);
  if (cuerpo) q.set("body", cuerpo);
  const s = q.toString().replace(/\+/g, "%20");
  return `mailto:${email}${s ? `?${s}` : ""}`;
}

/** Abre la navegación en Google Maps (o Apple Maps en iPhone vía el enlace universal). */
export function enlaceComoLlegar(c: { lat: number | null; lng: number | null; direccion: string | null; localidad?: string | null }): string | null {
  if (c.lat != null && c.lng != null) return `https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}`;
  if (c.direccion) return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent([c.direccion, c.localidad].filter(Boolean).join(", "))}`;
  return null;
}

/** Dirección pública de la app (para enlaces en mensajes). */
export function urlDeLaApp(): string {
  const s = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim().replace(/\/+$/, "");
  if (/^https?:\/\//.test(s)) return s;
  return s ? `https://${s}` : "https://crm-comercial-mu.vercel.app";
}

/** WhatsApp para el conductor con su ruta y el enlace a «Mi reparto». */
export function mensajeRutaConductor(r: { conductor: string; cuando: string; vehiculo: string | null; paradas: number; salida: string | null; url: string }): string {
  const nombre = r.conductor.split(" ")[0];
  const n = r.paradas === 1 ? "1 parada" : `${r.paradas} paradas`;
  return (
    `Hola ${nombre} 👋, ya tienes tu ruta de ${r.cuando}` +
    `${r.vehiculo ? ` con la ${r.vehiculo}` : ""}: ${n}${r.salida ? `, salida a las ${r.salida}` : ""}.\n` +
    `Ábrela aquí para ver el orden, las horas y marcar las entregas: ${r.url}/reparto`
  );
}
