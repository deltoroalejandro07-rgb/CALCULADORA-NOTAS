"use server";

import { z } from "zod";
import { exigirAdmin, usuarioActual } from "@/lib/auth";
import { consultarReparto, consultarVisitas, riesgoYPrevision, sumarDias } from "@/lib/ia/datos";
import { iaDisponible, preguntarCRM, redactarResumenIA, redactarSeguimientoIA, type TurnoChat } from "@/lib/ia/ia";
import { TEXTO_RESULTADO } from "@/lib/dominio/tipos";
import { fechaDentroDe } from "@/lib/dominio/visita";
import { supabaseServidor } from "@/lib/supabase/servidor";

const SIN_CLAVE = "La IA aún no está activada: falta poner la clave ANTHROPIC_API_KEY en Vercel.";
const mensajeError = (e: unknown) => {
  console.error("IA:", e);
  return "La IA no ha podido responder ahora. Inténtalo de nuevo en un momento.";
};

// ---------- Mensaje de seguimiento ----------

export async function redactarSeguimiento(clienteId: string, intencion: string): Promise<{ texto?: string; conIA?: boolean; error?: string }> {
  const usuario = await usuarioActual();
  const id = z.guid().parse(clienteId);
  const sb = await supabaseServidor();
  const [{ data: c }, { data: visitas }] = await Promise.all([
    sb.from("clientes").select("nombre_negocio, tipo, contacto_nombre, estado, proxima_accion, proxima_accion_fecha, notas").eq("id", id).maybeSingle(),
    sb.from("visitas").select("fecha, resultado, notas, proxima_accion, interes_texto").eq("cliente_id", id).order("fecha", { ascending: false }).limit(3),
  ]);
  if (!c) return { error: "No se encuentra el cliente." };
  const nombre = usuario.nombre.split(" ")[0];
  if (!iaDisponible()) {
    // Sin IA: una plantilla sencilla con lo último apuntado
    const saludo = c.contacto_nombre ? `Hola ${c.contacto_nombre.split(" ")[0]}` : "Hola";
    const ultima = visitas?.[0];
    const tema = ultima?.interes_texto ? ` sobre ${ultima.interes_texto}` : "";
    return {
      conIA: false,
      texto: `${saludo}, soy ${nombre} de dliverygo. Te escribo para retomar lo que hablamos${tema}. ¿Te va bien que me pase esta semana y lo vemos? Un saludo.`,
    };
  }
  try {
    const texto = await redactarSeguimientoIA({
      comercial: nombre,
      cliente: { nombre: c.nombre_negocio, tipo: c.tipo, contacto: c.contacto_nombre, estado: c.estado, proxima_accion: c.proxima_accion, notas: c.notas },
      visitas: (visitas ?? []).map((v) => ({ fecha: v.fecha.slice(0, 10), resultado: TEXTO_RESULTADO[v.resultado], notas: v.notas, interes: v.interes_texto, proxima_accion: v.proxima_accion })),
      intencion: intencion.trim().slice(0, 300) || undefined,
    });
    return { texto, conIA: true };
  } catch (e) {
    return { error: mensajeError(e) };
  }
}

// ---------- Resumen automático ----------

export async function generarResumen(periodo: "hoy" | "semana"): Promise<{ texto?: string; conIA?: boolean; error?: string }> {
  await exigirAdmin();
  const sb = await supabaseServidor();
  const hoy = fechaDentroDe(0);
  const desde = periodo === "hoy" ? hoy : sumarDias(hoy, -6);
  try {
    const [visitas, reparto, riesgo, { count: nuevos }] = await Promise.all([
      consultarVisitas(sb, { desde, hasta: hoy }),
      consultarReparto(sb, { desde, hasta: hoy }),
      riesgoYPrevision(sb, hoy),
      sb.from("clientes").select("*", { count: "exact", head: true }).gte("creado_at", desde + "T00:00:00"),
    ]);
    const datos = {
      periodo: periodo === "hoy" ? `hoy (${hoy})` : `últimos 7 días (${desde} a ${hoy})`,
      visitas: { total: visitas.total, por_comercial: visitas.por_comercial, por_resultado: visitas.por_resultado, ejemplos: visitas.visitas.slice(0, 15) },
      clientes_nuevos: nuevos ?? 0,
      reparto: { paradas: reparto.paradas, por_estado: reparto.por_estado, motivos_no_entregado: reparto.motivos_no_entregado, cobrado_eur: reparto.cobrado_total_eur, no_entregadas: reparto.no_entregadas.slice(0, 10) },
      clientes_en_riesgo: riesgo.clientes_en_riesgo.slice(0, 10),
      les_toca_pedir: riesgo.les_toca_pedir.slice(0, 10),
    };
    if (!iaDisponible()) {
      const lineas = [
        `Visitas: ${visitas.total}${Object.keys(visitas.por_comercial).length ? ` (${Object.entries(visitas.por_comercial).map(([k, v]) => `${k}: ${v}`).join(", ")})` : ""}`,
        `Clientes nuevos: ${nuevos ?? 0}`,
        `Reparto: ${reparto.por_estado.entregada ?? 0} entregadas, ${reparto.por_estado.fallida ?? 0} no entregadas de ${reparto.paradas} paradas`,
        `Clientes en riesgo: ${riesgo.clientes_en_riesgo.length}`,
        `Les toca pedir: ${riesgo.les_toca_pedir.filter((p) => p.estado === "le toca ya").length}`,
      ];
      return { conIA: false, texto: lineas.map((l) => `• ${l}`).join("\n") };
    }
    return { conIA: true, texto: await redactarResumenIA(datos.periodo, datos) };
  } catch (e) {
    return { error: mensajeError(e) };
  }
}

// ---------- Pregúntale a tu CRM ----------

const esquemaHistorial = z.array(z.object({ rol: z.enum(["usuario", "ia"]), texto: z.string().min(1).max(4000) })).min(1).max(20);

export async function preguntar(historial: TurnoChat[]): Promise<{ texto?: string; error?: string }> {
  await exigirAdmin();
  if (!iaDisponible()) return { error: SIN_CLAVE };
  const h = esquemaHistorial.safeParse(historial);
  if (!h.success || h.data.at(-1)?.rol !== "usuario") return { error: "Pregunta no válida." };
  try {
    return { texto: await preguntarCRM(await supabaseServidor(), h.data) };
  } catch (e) {
    return { error: mensajeError(e) };
  }
}
