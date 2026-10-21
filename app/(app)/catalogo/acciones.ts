"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { exigirAdmin } from "@/lib/auth";
import { CATEGORIAS_PRODUCTO, ESTADOS_CLIENTE, TIPOS_NEGOCIO } from "@/lib/dominio/tipos";
import { supabaseServidor } from "@/lib/supabase/servidor";

export interface EstadoForm {
  error?: string;
}

const texto = z.preprocess((v) => (v == null || String(v).trim() === "" ? null : String(v).trim()), z.string().max(2000).nullable());
const casilla = z.preprocess((v) => v === "on" || v === "true", z.boolean());
const lista = <T extends z.ZodTypeAny>(item: T) => z.preprocess((v) => (v == null || v === "" ? [] : JSON.parse(String(v))), z.array(item));

const esquemaProducto = z.object({
  nombre: z.string().trim().min(2, "Pon el nombre"),
  referencia: texto,
  categoria: z.enum(CATEGORIAS_PRODUCTO),
  formato: texto,
  precio_tarifa: z.preprocess((v) => Number(String(v).replace(",", ".")), z.number({ message: "Precio no válido" }).min(0, "Precio no válido")),
  destacado: casilla,
  activo: casilla,
  imagen_path: texto,
});

export async function guardarProducto(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  await exigirAdmin();
  const r = esquemaProducto.safeParse(Object.fromEntries(form));
  if (!r.success) return { error: r.error.issues[0].message };
  const id = form.get("id") as string | null;
  const sb = await supabaseServidor();
  const { error } = id ? await sb.from("productos").update(r.data).eq("id", id) : await sb.from("productos").insert(r.data);
  if (error) return { error: error.message };
  redirect("/catalogo");
}

const esquemaOferta = z
  .object({
    titulo: z.string().trim().min(3, "Pon un título"),
    descripcion: texto,
    condicion: texto,
    descuento_pct: z.preprocess((v) => (v == null || v === "" ? null : Number(String(v).replace(",", "."))), z.number().min(0).max(100, "El descuento va de 0 a 100").nullable()),
    fecha_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha de inicio no válida"),
    fecha_fin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha de fin no válida"),
    activa: casilla,
    productos: lista(z.guid()),
    segmento_tipos: lista(z.enum(TIPOS_NEGOCIO)),
    segmento_zonas: lista(z.string().min(1)),
    segmento_estados: lista(z.enum(ESTADOS_CLIENTE)),
    segmento_productos: lista(z.guid()),
  })
  .refine((o) => o.fecha_fin >= o.fecha_inicio, { message: "La fecha de fin no puede ser anterior al inicio" });

export async function guardarOferta(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  await exigirAdmin();
  const r = esquemaOferta.safeParse(Object.fromEntries(form));
  if (!r.success) return { error: r.error.issues[0].message };
  const { productos, ...oferta } = r.data;
  const id = form.get("id") as string | null;
  const sb = await supabaseServidor();
  let ofertaId = id;
  if (id) {
    const { error } = await sb.from("ofertas").update(oferta).eq("id", id);
    if (error) return { error: error.message };
  } else {
    const { data, error } = await sb.from("ofertas").insert(oferta).select("id").single();
    if (error) return { error: error.message };
    ofertaId = data.id;
  }
  await sb.from("oferta_productos").delete().eq("oferta_id", ofertaId!);
  if (productos.length) {
    const { error } = await sb.from("oferta_productos").insert(productos.map((producto_id) => ({ oferta_id: ofertaId!, producto_id })));
    if (error) return { error: error.message };
  }
  redirect("/ofertas");
}

export async function borrarOferta(form: FormData) {
  await exigirAdmin();
  const id = z.guid().parse(form.get("id"));
  const sb = await supabaseServidor();
  const { error } = await sb.from("ofertas").delete().eq("id", id);
  if (error) throw new Error(error.message);
  redirect("/ofertas");
}
