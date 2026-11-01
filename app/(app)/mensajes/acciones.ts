"use server";

import { actualizarPantallas } from "@/lib/actualizar";
import { redirect } from "next/navigation";
import { z } from "zod";
import { exigirAdmin, usuarioActual } from "@/lib/auth";
import { variablesDesconocidas } from "@/lib/dominio/plantillas";
import { supabaseServidor } from "@/lib/supabase/servidor";
import type { Json } from "@/lib/supabase/tipos-bd";

const uuidONull = z.preprocess((v) => (v == null || v === "" ? null : v), z.guid().nullable());

const esquemaMensaje = z.object({
  cliente_id: z.guid(),
  canal: z.enum(["whatsapp", "email"]),
  texto: z.string().min(1),
  asunto: z.string().nullable().optional(),
  oferta_id: uuidONull.optional(),
  plantilla_id: uuidONull.optional(),
  campana_id: uuidONull.optional(),
});

/** Se llama al pulsar «Abrir WhatsApp / email»: deja constancia del envío en el historial. */
export async function registrarEnvio(datos: z.input<typeof esquemaMensaje>): Promise<{ error?: string }> {
  const usuario = await usuarioActual();
  const d = esquemaMensaje.parse(datos);
  const sb = await supabaseServidor();
  const { error } = await sb.from("mensajes").insert({ ...d, comercial_id: usuario.id, estado: "enviado", enviado_at: new Date().toISOString() });
  // El trigger de la base de datos rechaza clientes sin consentimiento en ese canal
  if (error) return { error: error.message.includes("consentimiento") ? "Este cliente no ha dado su consentimiento para este canal." : error.message };
  return {};
}

export async function crearCampana(datos: { nombre: string; canal: "whatsapp" | "email"; plantilla_id: string | null; oferta_id: string | null; filtro: NonNullable<Json> }) {
  const usuario = await usuarioActual();
  const sb = await supabaseServidor();
  const { data, error } = await sb.from("campanas").insert({ ...datos, creado_por: usuario.id }).select("id").single();
  if (error) throw new Error(error.message);
  return data.id;
}

const esquemaPlantilla = z.object({
  nombre: z.string().trim().min(2, "Pon un nombre"),
  canal: z.enum(["whatsapp", "email"]),
  asunto: z.preprocess((v) => (v == null || String(v).trim() === "" ? null : String(v).trim()), z.string().nullable()),
  cuerpo: z.string().trim().min(5, "Escribe el mensaje"),
  activa: z.preprocess((v) => v === "on", z.boolean()),
});

export async function guardarPlantilla(_: { error?: string }, form: FormData): Promise<{ error?: string }> {
  await exigirAdmin();
  const r = esquemaPlantilla.safeParse(Object.fromEntries(form));
  if (!r.success) return { error: r.error.issues[0].message };
  const malas = variablesDesconocidas(r.data.cuerpo + " " + (r.data.asunto ?? ""));
  if (malas.length) return { error: `Variables que no existen: ${malas.map((v) => `{${v}}`).join(", ")}` };
  const id = form.get("id") as string | null;
  const sb = await supabaseServidor();
  const { error } = id ? await sb.from("plantillas").update(r.data).eq("id", id) : await sb.from("plantillas").insert(r.data);
  if (error) return { error: error.message };
  redirect("/mensajes?tab=plantillas");
}

export async function marcarMensaje(form: FormData) {
  await usuarioActual();
  const id = z.guid().parse(form.get("id"));
  const estado = z.enum(["respondido", "fallido", "enviado"]).parse(form.get("estado"));
  const sb = await supabaseServidor();
  await sb.from("mensajes").update({ estado }).eq("id", id);
  actualizarPantallas();
}
