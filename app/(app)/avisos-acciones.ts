"use server";

import { randomBytes } from "node:crypto";
import webpush from "web-push";
import { z } from "zod";
import { exigirAdmin, usuarioActual } from "@/lib/auth";
import { avisosConfigurados, enviarAvisos } from "@/lib/avisos";
import { supabaseServidor } from "@/lib/supabase/servidor";

const Suscripcion = z.object({
  endpoint: z.string().url().max(1000),
  keys: z.object({ p256dh: z.string().min(10).max(200), auth: z.string().min(4).max(100) }),
});

export async function guardarSuscripcion(s: unknown): Promise<{ error?: string }> {
  const u = await usuarioActual();
  const r = Suscripcion.safeParse(s);
  if (!r.success) return { error: "Este móvil no ha dado una dirección de avisos válida." };
  const sb = await supabaseServidor();
  // Si el móvil cambió de usuario, la dirección antigua se quita (es única)
  await sb.from("push_suscripciones").delete().eq("endpoint", r.data.endpoint);
  const { error } = await sb.from("push_suscripciones").insert({ usuario_id: u.id, endpoint: r.data.endpoint, p256dh: r.data.keys.p256dh, auth: r.data.keys.auth });
  return error ? { error: "No se han podido activar los avisos." } : {};
}

export async function borrarSuscripcion(endpoint: string) {
  await usuarioActual();
  const sb = await supabaseServidor();
  await sb.from("push_suscripciones").delete().eq("endpoint", endpoint.slice(0, 1000));
}

export async function avisoDePrueba(): Promise<{ ok?: string; error?: string }> {
  const u = await usuarioActual();
  if (!avisosConfigurados()) return { error: "Los avisos aún no están configurados en el servidor." };
  const n = await enviarAvisos([u.id], { titulo: "✓ Avisos activados", cuerpo: "Así te llegarán los recordatorios de dliverygo.", url: "/hoy" });
  return n ? { ok: n === 1 ? "Aviso enviado a tu móvil." : `Aviso enviado a tus ${n} dispositivos.` } : { error: "No se ha podido enviar. Desactiva y vuelve a activar los avisos." };
}

/** Claves nuevas para configurar los avisos (solo admin; se ven en su pantalla y se pegan en Vercel). */
export async function generarClavesAvisos(): Promise<{ publica: string; privada: string; cron: string }> {
  await exigirAdmin();
  const k = webpush.generateVAPIDKeys();
  return { publica: k.publicKey, privada: k.privateKey, cron: randomBytes(24).toString("base64url") };
}
