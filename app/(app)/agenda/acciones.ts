"use server";

import { actualizarPantallas } from "@/lib/actualizar";
import { z } from "zod";
import { usuarioActual } from "@/lib/auth";
import { supabaseServidor } from "@/lib/supabase/servidor";

export interface EstadoForm {
  error?: string;
  ok?: string;
}

const vacioANull = (v: unknown) => (v == null || (typeof v === "string" && v.trim() === "") ? null : typeof v === "string" ? v.trim() : v);
const texto = (max: number) => z.preprocess(vacioANull, z.string().max(max).nullable());
const hora = z.preprocess(vacioANull, z.string().regex(/^\d{2}:\d{2}$/, "Hora no válida").nullable());

const esquema = z
  .object({
    id: z.preprocess(vacioANull, z.guid().nullable()),
    tipo: z.enum(["reunion", "tarea", "nota"]),
    titulo: z.string().trim().min(1, "Pon un título").max(200),
    fecha: z.preprocess(vacioANull, z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha no válida").nullable()),
    hora_inicio: hora,
    hora_fin: hora,
    lugar: texto(300),
    cliente_id: z.preprocess(vacioANull, z.guid().nullable()),
    notas: texto(5000),
  })
  .refine((d) => d.tipo === "nota" || d.fecha, { message: "Elige el día", path: ["fecha"] })
  .refine((d) => !d.hora_inicio || !d.hora_fin || d.hora_fin >= d.hora_inicio, { message: "La hora de fin es antes que la de inicio", path: ["hora_fin"] });

export async function guardarEvento(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  await usuarioActual();
  const r = esquema.safeParse(Object.fromEntries(form));
  if (!r.success) return { error: r.error.issues[0].message };
  const { id, ...datos } = r.data;
  const sb = await supabaseServidor();
  const { error } = id
    ? await sb.from("agenda").update({ ...datos, actualizado_at: new Date().toISOString() }).eq("id", id)
    : await sb.from("agenda").insert(datos);
  if (error) return { error: "No se ha podido guardar. Inténtalo de nuevo." };
  actualizarPantallas();
  return { ok: id ? "Guardado." : datos.tipo === "nota" ? "Nota guardada." : datos.tipo === "tarea" ? "Tarea añadida." : "Reunión añadida." };
}

export async function borrarEvento(form: FormData) {
  await usuarioActual();
  const sb = await supabaseServidor();
  await sb.from("agenda").delete().eq("id", z.guid().parse(form.get("id")));
  actualizarPantallas();
}

export async function cambiarHecha(form: FormData) {
  await usuarioActual();
  const sb = await supabaseServidor();
  await sb.from("agenda").update({ hecha: form.get("hecha") === "true" }).eq("id", z.guid().parse(form.get("id")));
  actualizarPantallas();
}
