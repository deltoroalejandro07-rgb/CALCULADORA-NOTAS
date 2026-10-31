import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { ESTADOS_CLIENTE, RESULTADOS_VISITA, TIPOS_NEGOCIO, TIPOS_VISITA } from "@/lib/dominio/tipos";
import { fechaDentroDe } from "@/lib/dominio/visita";
import { buscarClientes, consultarAlbaranes, consultarReparto, consultarVisitas, riesgoYPrevision } from "./datos";
import type { supabaseServidor } from "@/lib/supabase/servidor";

type Sb = Awaited<ReturnType<typeof supabaseServidor>>;

export const iaDisponible = () => !!process.env.ANTHROPIC_API_KEY;

const MODELO = "claude-opus-5-5";
// Si un filtro de seguridad rechazara una petición, la API la reintenta sola en el modelo recomendado
const respaldo = () => ({ betas: ["server-side-fallback-2026-07-01"] as Anthropic.Beta.AnthropicBeta[], fallbacks: "default" as const });

const ESTILO =
  "Escribe en español de España, claro y directo, para el dueño de una distribuidora de bebidas y alimentación a hostelería (dliverygo). " +
  "Texto plano: sin markdown, sin asteriscos ni almohadillas, sin tablas. Para listas usa líneas que empiecen por «• ». " +
  "No inventes datos: usa solo lo que te den las herramientas o el contexto. Si algo no está en el CRM (por ejemplo facturación o pedidos, que van en Holded), dilo.";

function textoDe(r: Anthropic.Beta.BetaMessage): string {
  if (r.stop_reason === "refusal") throw new Error("La IA no ha podido responder a esto.");
  return r.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

/** Mensaje de WhatsApp de seguimiento para un cliente, según lo hablado en sus visitas. */
export async function redactarSeguimientoIA(ctx: { comercial: string; cliente: Record<string, unknown>; visitas: Record<string, unknown>[]; intencion?: string }): Promise<string> {
  const client = new Anthropic();
  const r = await client.beta.messages.create({
    model: MODELO,
    max_tokens: 4000,
    output_config: { effort: "low" },
    ...respaldo(),
    system:
      "Redactas mensajes de WhatsApp de seguimiento que un comercial de dliverygo (distribuidora a hostelería) envía a un bar, restaurante u hotel. " +
      "Tono cercano y profesional, tuteando, como escribe un comercial de confianza. Máximo 5 líneas, sin asunto, sin hashtags, un emoji como mucho. " +
      "Menciona algo concreto de la última visita si lo hay y termina con una propuesta clara (pasar a verle, enviar la oferta, llevar muestras…). " +
      "Firma con el nombre del comercial. Devuelve solo el texto del mensaje.",
    messages: [
      {
        role: "user",
        content: `Comercial: ${ctx.comercial}\nCliente: ${JSON.stringify(ctx.cliente)}\nÚltimas visitas (de la más reciente a la más antigua): ${JSON.stringify(ctx.visitas)}${ctx.intencion ? `\nLo que quiere conseguir el comercial con este mensaje: ${ctx.intencion}` : ""}`,
      },
    ],
  });
  return textoDe(r);
}

/** Resumen escrito a partir de las cifras ya calculadas. */
export async function redactarResumenIA(periodo: string, datos: unknown): Promise<string> {
  const client = new Anthropic();
  const r = await client.beta.messages.create({
    model: MODELO,
    max_tokens: 6000,
    output_config: { effort: "medium" },
    ...respaldo(),
    system:
      ESTILO +
      " Te pasan las cifras del CRM y del reparto. Escribe un resumen breve (máximo 250 palabras) con estos apartados, cada uno con su título en una línea: " +
      "«Lo más importante», «Comerciales», «Reparto» y «En qué fijarte». En el último, 2 o 3 acciones concretas con nombres de clientes o comerciales.",
    messages: [{ role: "user", content: `Periodo: ${periodo}\nDatos: ${JSON.stringify(datos)}` }],
  });
  return textoDe(r);
}

export interface TurnoChat {
  rol: "usuario" | "ia";
  texto: string;
}

/** «Pregúntale a tu CRM»: la IA consulta los datos con herramientas de solo lectura y responde. */
export async function preguntarCRM(sb: Sb, historial: TurnoChat[]): Promise<string> {
  const hoy = fechaDentroDe(0);
  const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe("AAAA-MM-DD");
  const json = (x: unknown) => JSON.stringify(x);
  const herramientas = [
    betaZodTool({
      name: "buscar_clientes",
      description: "Busca fichas de clientes del CRM con filtros. Devuelve el total, el reparto por estado y la lista (estado, zona, comercial, última visita, próxima acción, notas).",
      inputSchema: z.object({
        texto: z.string().optional().describe("Parte del nombre, zona, localidad o notas"),
        estado: z.enum(ESTADOS_CLIENTE).optional(),
        zona: z.string().optional(),
        comercial: z.string().optional().describe("Nombre del comercial"),
        sin_visita_dias: z.number().int().positive().optional().describe("Solo los que llevan al menos estos días sin visita (o nunca visitados)"),
        seguimiento_vencido: z.boolean().optional().describe("Solo los que tienen la próxima acción con fecha pasada"),
        limite: z.number().int().positive().max(80).optional(),
      }),
      run: async (f) => json(await buscarClientes(sb, hoy, f)),
    }),
    betaZodTool({
      name: "consultar_visitas",
      description: "Visitas comerciales entre dos fechas: total, por comercial, por resultado, por zona y la lista con notas.",
      inputSchema: z.object({
        desde: fecha,
        hasta: fecha,
        comercial: z.string().optional(),
        resultado: z.enum(["no_estaba", "sin_interes", "pide_info", "interesado", "pide_oferta", "hace_pedido"]).optional(),
        zona: z.string().optional(),
      }),
      run: async (f) => json(await consultarVisitas(sb, f)),
    }),
    betaZodTool({
      name: "consultar_reparto",
      description: "Reparto entre dos fechas (por fecha de la ruta): paradas entregadas, no entregadas y pendientes, motivos de no entrega, por conductor, cobrado y lista de no entregadas.",
      inputSchema: z.object({ desde: fecha, hasta: fecha }),
      run: async (f) => json(await consultarReparto(sb, f)),
    }),
    betaZodTool({
      name: "consultar_albaranes",
      description: "Albaranes subidos entre dos fechas: cuántos, por cliente y productos más repartidos (unidades).",
      inputSchema: z.object({ desde: fecha, hasta: fecha, cliente: z.string().optional() }),
      run: async (f) => json(await consultarAlbaranes(sb, f)),
    }),
    betaZodTool({
      name: "riesgo_y_prevision",
      description: "Clientes en riesgo (se están enfriando, con el motivo) y clientes a los que por su ritmo de albaranes les toca pedir.",
      inputSchema: z.object({}),
      run: async () => json(await riesgoYPrevision(sb, hoy)),
    }),
  ];

  const client = new Anthropic();
  const final = await client.beta.messages.toolRunner({
    model: MODELO,
    max_tokens: 16000,
    max_iterations: 8,
    output_config: { effort: "medium" },
    ...respaldo(),
    system:
      ESTILO +
      ` Hoy es ${hoy} (hora de Madrid; la semana empieza en lunes). Responde a las preguntas sobre el CRM de ventas y el reparto consultando las herramientas. ` +
      "Da cifras concretas y nombres. Sé breve: una frase de respuesta y, si hace falta, una lista corta. Si la pregunta es ambigua, elige la interpretación más útil y di cuál has usado.",
    tools: herramientas,
    messages: historial.slice(-10).map((t) => ({ role: t.rol === "usuario" ? ("user" as const) : ("assistant" as const), content: t.texto })),
  });
  return textoDe(final);
}

// ---------- Foto de tarjeta o fachada → ficha de cliente ----------

export const EsquemaFotoCliente = z.object({
  nombre_negocio: z.string().nullable(),
  tipo: z.enum(TIPOS_NEGOCIO).nullable(),
  contacto_nombre: z.string().nullable(),
  contacto_cargo: z.string().nullable(),
  telefono: z.string().nullable(),
  email: z.string().nullable(),
  direccion: z.string().nullable().describe("Calle y número"),
  localidad: z.string().nullable(),
  codigo_postal: z.string().nullable(),
  horario_visita: z.string().nullable().describe("Horario de apertura si aparece, p. ej. «L-V 8:00-16:00»"),
  notas: z.string().nullable().describe("Otros datos útiles (web, redes, especialidad), en una frase"),
});
export type DatosFotoCliente = z.infer<typeof EsquemaFotoCliente>;

export async function leerFotoClienteIA(base64: string, tipo: "image/jpeg" | "image/png" | "image/webp"): Promise<DatosFotoCliente> {
  const client = new Anthropic();
  const r = await client.beta.messages.create({
    model: MODELO,
    max_tokens: 4000,
    output_config: { effort: "low", format: zodOutputFormat(EsquemaFotoCliente) },
    ...respaldo(),
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: tipo, data: base64 } },
          {
            type: "text",
            text:
              "Es la foto de una tarjeta de visita, un cartel o la fachada de un negocio de hostelería en España. Extrae los datos para dar de alta al cliente. " +
              "El tipo es bar, restaurante, cafeteria, hotel, pub, catering u otro. Escribe los nombres con mayúsculas normales (no todo en mayúsculas). " +
              "No inventes nada: deja a null lo que no se vea.",
          },
        ],
      },
    ],
  });
  const t = textoDe(r);
  const d = EsquemaFotoCliente.safeParse(JSON.parse(t));
  if (!d.success) throw new Error("La IA ha devuelto datos incompletos.");
  return d.data;
}

// ---------- Visita por voz → campos de la visita ----------

export const EsquemaVisitaVoz = z.object({
  resultado: z.enum(RESULTADOS_VISITA).nullable().describe("no_estaba: no estaba el responsable; sin_interes; pide_info; interesado; pide_oferta; hace_pedido"),
  tipo: z.enum(TIPOS_VISITA).nullable().describe("puerta_fria: primera visita; propaganda: dejar folletos; seguimiento; degustacion; toma_pedido; incidencia"),
  interes: z.string().nullable().describe("Productos que le interesan, separados por comas"),
  nota: z.string().describe("Resumen claro de lo hablado, en 1-3 frases, en tercera persona"),
  proxima_accion: z.string().nullable().describe("Lo siguiente que hay que hacer, corto: «Llevar muestras de vermut»"),
  proxima_accion_fecha: z.string().nullable().describe("AAAA-MM-DD"),
});
export type DatosVisitaVoz = z.infer<typeof EsquemaVisitaVoz>;

export async function interpretarVisitaIA(texto: string, ctx: { hoy: string; cliente?: string }): Promise<DatosVisitaVoz> {
  const client = new Anthropic();
  const r = await client.beta.messages.create({
    model: MODELO,
    max_tokens: 4000,
    output_config: { effort: "low", format: zodOutputFormat(EsquemaVisitaVoz) },
    ...respaldo(),
    system:
      "Conviertes lo que dicta un comercial de una distribuidora de bebidas a hostelería al salir de una visita en los campos de la visita. " +
      `Hoy es ${ctx.hoy}. Convierte fechas relativas («el jueves», «la semana que viene», «en 15 días») a AAAA-MM-DD; si no dice cuándo, deja la fecha a null. ` +
      "No inventes: deja a null lo que no se diga. Corrige errores evidentes del dictado.",
    messages: [{ role: "user", content: `${ctx.cliente ? `Cliente: ${ctx.cliente}\n` : ""}Dictado: «${texto}»` }],
  });
  const d = EsquemaVisitaVoz.safeParse(JSON.parse(textoDe(r)));
  if (!d.success) throw new Error("La IA ha devuelto datos incompletos.");
  return d.data;
}
