import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { Rol } from "./dominio/tipos";
import { supabaseServidor } from "./supabase/servidor";

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
}

/** Usuario actual con su perfil. Una sola consulta por petición. */
export const usuarioActual = cache(async (): Promise<Usuario> => {
  const supabase = await supabaseServidor();
  const { data } = await supabase.auth.getClaims();
  const id = data?.claims?.sub;
  if (!id) redirect("/login");

  const { data: perfil } = await supabase.from("perfiles").select("id, nombre, email, rol, activo").eq("id", id).single();
  if (!perfil || !perfil.activo) redirect("/login?motivo=sin-acceso");

  return { id: perfil.id, nombre: perfil.nombre, email: perfil.email, rol: perfil.rol };
});

export async function exigirAdmin(): Promise<Usuario> {
  const usuario = await usuarioActual();
  if (usuario.rol !== "admin") redirect("/hoy");
  return usuario;
}
