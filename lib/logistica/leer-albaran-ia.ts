import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { AlbaranLeido } from "./holded-pdf";

// Respaldo con IA para PDF que no siguen la plantilla de Holded (otro proveedor, un escaneo…).
// Solo se usa si hay ANTHROPIC_API_KEY en el servidor. Los PDF de Holded se leen sin IA.

const Esquema = z.object({
  albaranes: z.array(
    z.object({
      numero: z.string().nullable(),
      fecha: z.string().nullable().describe("AAAA-MM-DD"),
      cliente: z.string(),
      nif: z.string().nullable(),
      telefono: z.string().nullable(),
      direccion: z.string().nullable().describe("Calle y número de la dirección de ENTREGA (o envío); si no hay, la del cliente"),
      localidad: z.string().nullable(),
      codigo_postal: z.string().nullable(),
      lineas: z.array(z.object({ descripcion: z.string(), cantidad: z.number() })),
      horario: z.string().nullable().describe("Horario o franja de entrega tal cual aparece, si lo hay"),
      ruta: z.string().nullable().describe("Ruta o zona de reparto tal cual aparece, si la hay"),
      notas: z.string().nullable(),
    }),
  ),
});

export const iaDisponible = () => !!process.env.ANTHROPIC_API_KEY;

export async function leerAlbaranesConIA(pdf: Uint8Array): Promise<AlbaranLeido[]> {
  const client = new Anthropic();
  const response = await client.beta.messages.create({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    output_config: { effort: "low", format: zodOutputFormat(Esquema) },
    // Si un filtro de seguridad rechazara la petición, se reintenta en el modelo recomendado
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    messages: [
      {
        role: "user",
        content: [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: Buffer.from(pdf).toString("base64") } },
          {
            type: "text",
            text:
              "Este PDF contiene uno o varios albaranes o pedidos de venta de una distribuidora. Extrae cada uno. " +
              "Usa la dirección de entrega o de envío (no la fiscal) si aparece. Las cantidades son las unidades de cada producto. " +
              "No inventes datos: deja a null lo que no aparezca.",
          },
        ],
      },
    ],
  });
  if (response.stop_reason === "refusal") throw new Error("La IA no ha podido leer este documento.");
  const texto = response.content.find((b) => b.type === "text");
  if (!texto || texto.type !== "text") throw new Error("La IA no ha devuelto datos.");
  const r = Esquema.safeParse(JSON.parse(texto.text));
  if (!r.success) throw new Error("La IA ha devuelto datos incompletos.");
  return r.data.albaranes.map((a) => ({ ...a, numero: a.numero?.trim().toUpperCase() || null }));
}
