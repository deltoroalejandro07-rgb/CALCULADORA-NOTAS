"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { exigirAdmin } from "@/lib/auth";
import { normalizarTelefono } from "@/lib/dominio/visita";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServidor } from "@/lib/supabase/servidor";

export interface Resultado {
  ok?: string;
  error?: string;
}

const esquemaAlta = z.object({
  nombre: z.string().trim().min(2, "Pon el nombre"),
  email: z.string().trim().toLowerCase().email("Email no válido"),
  rol: z.enum(["comercial", "admin", "repartidor"]),
  contrasena: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  telefono: z.string().trim().max(30).optional(),
});

export async function crearUsuario(_: Resultado, form: FormData): Promise<Resultado> {
  await exigirAdmin();
  const r = esquemaAlta.safeParse(Object.fromEntries(form));
  if (!r.success) return { error: r.error.issues[0].message };
  const admin = supabaseAdmin();
  if (!admin) return { error: "Falta configurar SUPABASE_SECRET_KEY en Vercel (ver instrucciones abajo)." };

  // Sin email de invitación: el comercial entra con su email y esta contraseña
  const { data, error } = await admin.auth.admin.createUser({
    email: r.data.email,
    password: r.data.contrasena,
    email_confirm: true,
    user_metadata: { nombre: r.data.nombre },
  });
  if (error) {
    return { error: /already|registered|exists/i.test(error.message) ? "Ya existe un usuario con ese email." : error.message };
  }
  const sb = await supabaseServidor();
  const telefono = r.data.telefono ? normalizarTelefono(r.data.telefono) : null;
  const { error: e2 } = await sb.from("perfiles").update({ nombre: r.data.nombre, rol: r.data.rol, telefono }).eq("id", data.user.id);
  if (e2) return { error: e2.message };
  refresh();
  return { ok: `${r.data.nombre} ya puede entrar con ${r.data.email} y la contraseña «${r.data.contrasena}».` };
}

const esquemaCambio = z.object({
  id: z.guid(),
  accion: z.enum(["rol", "activar", "desactivar", "traspasar", "contrasena", "telefono"]),
  rol: z.enum(["comercial", "admin", "repartidor"]).optional(),
  destino: z.guid().optional(),
  contrasena: z.string().optional(),
  telefono: z.string().max(30).optional(),
});

export async function cambiarUsuario(form: FormData): Promise<Resultado> {
  const yo = await exigirAdmin();
  const d = esquemaCambio.parse(Object.fromEntries(form));
  if (d.id === yo.id && !["traspasar", "contrasena", "telefono"].includes(d.accion)) return { error: "No puedes cambiar tu propio rol ni desactivarte." };
  const sb = await supabaseServidor();
  const admin = supabaseAdmin();

  if (d.accion === "contrasena") {
    if (!d.contrasena || d.contrasena.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres." };
    if (!admin) return { error: "Falta configurar SUPABASE_SECRET_KEY en Vercel." };
    const { error } = await admin.auth.admin.updateUserById(d.id, { password: d.contrasena });
    if (error) return { error: error.message };
    return { ok: `Contraseña cambiada a «${d.contrasena}».` };
  }
  if (d.accion === "telefono") {
    const t = d.telefono?.trim() ? normalizarTelefono(d.telefono) : null;
    if (d.telefono?.trim() && !t) return { error: "Ese teléfono no parece válido." };
    const { error } = await sb.from("perfiles").update({ telefono: t }).eq("id", d.id);
    if (error) return { error: error.message };
    refresh();
    return { ok: t ? `Teléfono guardado: ${t}.` : "Teléfono quitado." };
  }
  if (d.accion === "rol" && d.rol) {
    const { error } = await sb.from("perfiles").update({ rol: d.rol }).eq("id", d.id);
    if (error) return { error: error.message };
  }
  if (d.accion === "activar" || d.accion === "desactivar") {
    const activo = d.accion === "activar";
    const { error } = await sb.from("perfiles").update({ activo }).eq("id", d.id);
    if (error) return { error: error.message };
    // Bloquea también la sesión en Supabase para que no pueda seguir usando la que tenga abierta
    if (admin) await admin.auth.admin.updateUserById(d.id, { ban_duration: activo ? "none" : "876000h" });
  }
  if (d.accion === "traspasar" && d.destino) {
    const { error } = await sb.from("clientes").update({ comercial_id: d.destino }).eq("comercial_id", d.id);
    if (error) return { error: error.message };
  }
  refresh();
  return { ok: "Hecho." };
}
