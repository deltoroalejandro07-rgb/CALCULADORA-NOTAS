"use server";

import { z } from "zod";
import { exigirAdmin } from "@/lib/auth";
import { ESTADOS_CLIENTE, TIPOS_NEGOCIO } from "@/lib/dominio/tipos";
import { supabaseServidor } from "@/lib/supabase/servidor";

const fila = z.object({
  nombre_negocio: z.string().min(1).max(200),
  tipo: z.enum(TIPOS_NEGOCIO),
  estado: z.enum(ESTADOS_CLIENTE),
  contacto_nombre: z.string().max(200).nullable(),
  contacto_cargo: z.string().max(200).nullable(),
  telefono: z.string().max(40).nullable(),
  email: z.string().max(200).nullable(),
  direccion: z.string().max(300).nullable(),
  localidad: z.string().max(120).nullable(),
  codigo_postal: z.string().max(20).nullable(),
  zona: z.string().max(120).nullable(),
  proveedor_actual: z.string().max(200).nullable(),
  volumen_estimado_eur: z.number().min(0).nullable(),
  horario_visita: z.string().max(200).nullable(),
  etiquetas: z.array(z.string().max(60)).max(20),
  notas: z.string().max(4000).nullable(),
  consiente_whatsapp: z.boolean(),
  consiente_email: z.boolean(),
});

const esquema = z.object({
  filas: z.array(fila).min(1).max(500),
  comercial_id: z.guid().nullable(),
  archivo: z.string().max(200),
  importar_consentimientos: z.boolean(),
});

// El consentimiento no se escribe directamente en el cliente: se registra en `consentimientos` (con prueba)
function sinConsentimiento<T extends { consiente_whatsapp: boolean; consiente_email: boolean }>(f: T): Omit<T, "consiente_whatsapp" | "consiente_email"> {
  const c: Partial<T> = { ...f };
  delete c.consiente_whatsapp;
  delete c.consiente_email;
  return c as Omit<T, "consiente_whatsapp" | "consiente_email">;
}

/** Importa un lote (máx. 500) de clientes. El navegador manda el fichero por lotes. */
export async function importarLote(datos: z.input<typeof esquema>): Promise<{ creados: number; consentimientos: number; error?: string }> {
  const yo = await exigirAdmin();
  const r = esquema.safeParse(datos);
  if (!r.success) return { creados: 0, consentimientos: 0, error: r.error.issues[0].message };
  const { filas, comercial_id, archivo, importar_consentimientos } = r.data;
  const sb = await supabaseServidor();

  const { data: creados, error } = await sb
    .from("clientes")
    .insert(filas.map((f) => ({ ...sinConsentimiento(f), comercial_id })))
    .select("id");
  if (error) return { creados: 0, consentimientos: 0, error: error.message };

  let consentimientos = 0;
  if (importar_consentimientos) {
    const registros = filas.flatMap((f, i) =>
      (["whatsapp", "email"] as const)
        .filter((canal) => (canal === "whatsapp" ? f.consiente_whatsapp : f.consiente_email))
        .map((canal) => ({
          cliente_id: creados[i].id,
          canal,
          otorgado: true,
          origen: "formulario_papel" as const,
          evidencia: `Importado de «${archivo}» (consentimiento documentado según quien importó)`,
          registrado_por: yo.id,
        })),
    );
    if (registros.length) {
      const { error: e2 } = await sb.from("consentimientos").insert(registros);
      if (e2) return { creados: creados.length, consentimientos: 0, error: `Clientes creados, pero no los consentimientos: ${e2.message}` };
      consentimientos = registros.length;
    }
  }
  return { creados: creados.length, consentimientos };
}
