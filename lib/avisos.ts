import "server-only";
import webpush from "web-push";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Avisos en el móvil (Web Push). Necesita en Vercel NEXT_PUBLIC_VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY
// (se generan en Ajustes → Avisos) y SUPABASE_SECRET_KEY para leer los móviles suscritos.

export interface Aviso {
  titulo: string;
  cuerpo: string;
  url?: string;
  etiqueta?: string;
}

export const clavePublicaAvisos = () => process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null;
export const avisosConfigurados = () => !!(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.SUPABASE_SECRET_KEY);

/** Envía el aviso a todos los móviles de esos usuarios. Devuelve cuántos se han enviado. */
export async function enviarAvisos(usuarioIds: string[], aviso: Aviso): Promise<number> {
  const admin = supabaseAdmin();
  if (!avisosConfigurados() || !admin || !usuarioIds.length) return 0;
  webpush.setVapidDetails(process.env.NEXT_PUBLIC_SITE_URL ?? "https://crm-comercial-mu.vercel.app", process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
  const { data: subs } = await admin.from("push_suscripciones").select("id, endpoint, p256dh, auth").in("usuario_id", [...new Set(usuarioIds)]);
  let enviados = 0;
  const caducadas: string[] = [];
  await Promise.all(
    (subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(aviso), { TTL: 60 * 60 * 12 });
        enviados++;
      } catch (e) {
        const codigo = (e as { statusCode?: number }).statusCode;
        if (codigo === 404 || codigo === 410) caducadas.push(s.id); // el móvil ya no acepta avisos
        else console.error("Aviso no enviado:", codigo ?? e);
      }
    }),
  );
  if (caducadas.length) await admin.from("push_suscripciones").delete().in("id", caducadas);
  return enviados;
}

const plural = (n: number, una: string, varias: string) => (n === 1 ? `1 ${una}` : `${n} ${varias}`);

/** Resumen de cada mañana: agenda y seguimientos para comerciales; ruta del día para conductores. */
export async function enviarAvisosDiarios(hoy: string): Promise<number> {
  const admin = supabaseAdmin();
  if (!avisosConfigurados() || !admin) return 0;
  const { data: subs } = await admin.from("push_suscripciones").select("usuario_id");
  const usuarios = [...new Set((subs ?? []).map((s) => s.usuario_id))];
  if (!usuarios.length) return 0;
  const [{ data: perfiles }, { data: agenda }, { data: clientes }, { data: rutas }] = await Promise.all([
    admin.from("perfiles").select("id, nombre, rol, activo").in("id", usuarios),
    admin.from("agenda").select("usuario_id, tipo, hecha, fecha").in("usuario_id", usuarios).neq("tipo", "nota").lte("fecha", hoy),
    admin.from("clientes").select("comercial_id, proxima_accion_fecha").in("comercial_id", usuarios).neq("estado", "perdido").lte("proxima_accion_fecha", hoy),
    admin.from("rutas").select("conductor_id, paradas(id)").in("conductor_id", usuarios).eq("fecha", hoy),
  ]);
  let enviados = 0;
  for (const p of perfiles ?? []) {
    if (!p.activo) continue;
    const rutasHoy = (rutas ?? []).filter((r) => r.conductor_id === p.id);
    const paradas = rutasHoy.reduce((s, r) => s + r.paradas.length, 0);
    if (p.rol === "repartidor") {
      if (paradas) enviados += await enviarAvisos([p.id], { titulo: "🚚 Tu ruta de hoy", cuerpo: `${plural(paradas, "parada", "paradas")}. Ábrela para ver el orden y las horas.`, url: "/reparto", etiqueta: "diario" });
      continue;
    }
    const reuniones = (agenda ?? []).filter((a) => a.usuario_id === p.id && a.fecha === hoy && a.tipo === "reunion").length;
    const tareas = (agenda ?? []).filter((a) => a.usuario_id === p.id && a.tipo === "tarea" && !a.hecha).length;
    const vencidos = (clientes ?? []).filter((c) => c.comercial_id === p.id && c.proxima_accion_fecha! < hoy).length;
    const deHoy = (clientes ?? []).filter((c) => c.comercial_id === p.id && c.proxima_accion_fecha === hoy).length;
    const partes = [
      reuniones && plural(reuniones, "reunión", "reuniones"),
      tareas && plural(tareas, "tarea pendiente", "tareas pendientes"),
      deHoy && plural(deHoy, "seguimiento para hoy", "seguimientos para hoy"),
      vencidos && plural(vencidos, "seguimiento vencido", "seguimientos vencidos"),
      paradas && `ruta de reparto con ${plural(paradas, "parada", "paradas")}`,
    ].filter(Boolean);
    if (!partes.length) continue;
    enviados += await enviarAvisos([p.id], { titulo: `Buenos días, ${p.nombre.split(" ")[0]}`, cuerpo: `Hoy: ${partes.join(", ")}.`, url: paradas && !reuniones && !deHoy ? "/reparto" : "/hoy", etiqueta: "diario" });
  }
  return enviados;
}
