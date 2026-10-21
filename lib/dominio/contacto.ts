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
