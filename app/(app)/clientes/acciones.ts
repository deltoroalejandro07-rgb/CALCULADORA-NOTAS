"use server";

import { actualizarPantallas } from "@/lib/actualizar";
import { redirect } from "next/navigation";
import { z } from "zod";
import { usuarioActual } from "@/lib/auth";
import { ESTADOS_CLIENTE, TIPOS_NEGOCIO } from "@/lib/dominio/tipos";
import { normalizarTelefono } from "@/lib/dominio/visita";
import { supabaseServidor } from "@/lib/supabase/servidor";

// Campo vacío o no enviado → null
const vacioANull = (v: unknown) => (v == null || (typeof v === "string" && v.trim() === "") ? null : typeof v === "string" ? v.trim() : v);
const texto = z.preprocess(vacioANull, z.string().max(2000).nullable());
const numero = z.preprocess((v) => (v === "" || v == null ? null : Number(String(v).replace(",", "."))), z.number().finite().nullable());

const esquemaCliente = z.object({
  nombre_negocio: z.string().trim().min(2, "Pon el nombre del negocio"),
  tipo: z.enum(TIPOS_NEGOCIO),
  estado: z.enum(ESTADOS_CLIENTE),
  motivo_perdida: texto,
  contacto_nombre: texto,
  contacto_cargo: texto,
  telefono: texto,
  email: z.preprocess(vacioANull, z.string().email("Email no válido").nullable()),
  direccion: texto,
  localidad: texto,
  codigo_postal: texto,
  zona: texto,
  lat: numero,
  lng: numero,
  horario_visita: texto,
  proveedor_actual: texto,
  volumen_estimado_eur: numero.refine((v) => v == null || v >= 0, "No puede ser negativo"),
  etiquetas: z.preprocess((v) => String(v ?? "").split(",").map((s) => s.trim()).filter(Boolean), z.array(z.string())),
  notas: texto,
  proxima_accion: texto,
  proxima_accion_fecha: z.preprocess(vacioANull, z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable()),
  comercial_id: z.preprocess(vacioANull, z.guid().nullable()),
});

export interface EstadoFormulario {
  error?: string;
  campos?: Record<string, string>;
}

export async function guardarCliente(_: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  const usuario = await usuarioActual();
  const id = form.get("id") as string | null;
  const r = esquemaCliente.safeParse(Object.fromEntries(form));
  if (!r.success) {
    const campos: Record<string, string> = {};
    r.error.issues.forEach((i) => (campos[String(i.path[0])] = i.message));
    return { error: "Revisa los campos marcados.", campos };
  }
  const datos = r.data;
  if (datos.estado === "perdido" && !datos.motivo_perdida) {
    return { error: "Indica por qué se ha perdido.", campos: { motivo_perdida: "Obligatorio si está perdido" } };
  }
  const fila = {
    ...datos,
    telefono: datos.telefono ? (normalizarTelefono(datos.telefono) ?? datos.telefono) : null,
    motivo_perdida: datos.estado === "perdido" ? datos.motivo_perdida : null,
  };
  // Solo el admin asigna comercial (la base de datos también lo impide)
  if (usuario.rol !== "admin") delete (fila as Partial<typeof fila>).comercial_id;

  const sb = await supabaseServidor();
  let clienteId = id;
  if (id) {
    const { error } = await sb.from("clientes").update(fila).eq("id", id);
    if (error) return { error: `No se ha podido guardar: ${error.message}` };
  } else {
    const { data, error } = await sb
      .from("clientes")
      .insert({ ...fila, comercial_id: usuario.rol === "admin" ? (fila.comercial_id ?? usuario.id) : usuario.id })
      .select("id")
      .single();
    if (error) return { error: `No se ha podido crear: ${error.message}` };
    clienteId = data.id;
  }
  redirect(`/clientes/${clienteId}`);
}

const esquemaConsentimiento = z.object({
  cliente_id: z.guid(),
  canal: z.enum(["whatsapp", "email"]),
  otorgado: z.enum(["si", "no"]).transform((v) => v === "si"),
  origen: z.enum(["verbal_visita", "formulario_papel", "whatsapp", "email", "web"]),
  evidencia: texto,
});

export async function registrarConsentimiento(form: FormData) {
  const usuario = await usuarioActual();
  const d = esquemaConsentimiento.parse(Object.fromEntries(form));
  const sb = await supabaseServidor();
  const { error } = await sb.from("consentimientos").insert({ ...d, registrado_por: usuario.id });
  if (error) throw new Error(error.message);
  actualizarPantallas();
}

/** Derecho de supresión (RGPD): borra el cliente y en cascada visitas, fotos, mensajes y pedidos. Solo admin. */
export async function borrarCliente(form: FormData) {
  const usuario = await usuarioActual();
  if (usuario.rol !== "admin") throw new Error("Solo el administrador puede borrar clientes");
  const id = z.guid().parse(form.get("id"));
  const sb = await supabaseServidor();
  const { data: fotos } = await sb.from("visita_fotos").select("storage_path, visitas!inner(cliente_id)").eq("visitas.cliente_id", id);
  if (fotos?.length) await sb.storage.from("visitas").remove(fotos.map((f) => f.storage_path));
  const { error } = await sb.from("clientes").delete().eq("id", id);
  if (error) throw new Error(error.message);
  redirect("/clientes");
}
