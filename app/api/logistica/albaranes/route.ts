import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { leerAlbaranesHolded } from "@/lib/logistica/holded-pdf";
import { guardarAlbaranes, type ResultadoImportacion } from "@/lib/logistica/importar";
import { iaDisponible, leerAlbaranesConIA } from "@/lib/logistica/leer-albaran-ia";
import { filasDelPdf } from "@/lib/logistica/pdf-texto";
import { supabaseServidor } from "@/lib/supabase/servidor";

// Lee los PDF ya subidos al almacén privado «albaranes» y guarda lo que contienen.
// Los de Holded se leen sin IA; los de otro formato, con IA si está configurada.
export const maxDuration = 120;

const Cuerpo = z.object({ paths: z.array(z.string().regex(/^[0-9a-f-]{36}\.pdf$/i)).min(1).max(30) });

export interface RespuestaImportar {
  archivos: { path: string; nombre?: string; error?: string; leidoCon?: "holded" | "ia"; albaranes: ResultadoImportacion[] }[];
}

export async function POST(request: NextRequest) {
  const sb = await supabaseServidor();
  const { data: claims } = await sb.auth.getClaims();
  const uid = claims?.claims?.sub;
  if (!uid) return NextResponse.json({ error: "Sin sesión" }, { status: 401 });
  const { data: perfil } = await sb.from("perfiles").select("rol, activo").eq("id", uid).single();
  if (perfil?.rol !== "admin" || !perfil.activo) return NextResponse.json({ error: "Solo la oficina puede importar albaranes" }, { status: 403 });

  const cuerpo = Cuerpo.safeParse(await request.json().catch(() => null));
  if (!cuerpo.success) return NextResponse.json({ error: "Petición no válida" }, { status: 400 });

  const respuesta: RespuestaImportar = { archivos: [] };
  for (const path of cuerpo.data.paths) {
    try {
      const { data: fichero, error } = await sb.storage.from("albaranes").download(path);
      if (error || !fichero) throw new Error("No se ha podido abrir el PDF subido.");
      const bytes = new Uint8Array(await fichero.arrayBuffer());
      let leidos = leerAlbaranesHolded(await filasDelPdf(bytes.slice()));
      let leidoCon: "holded" | "ia" = "holded";
      if (!leidos.length) {
        if (!iaDisponible()) throw new Error("No parece un albarán de Holded. Para leer otros formatos hay que configurar la IA (clave de Anthropic).");
        leidos = await leerAlbaranesConIA(bytes);
        leidoCon = "ia";
      }
      if (!leidos.length) throw new Error("No se ha encontrado ningún albarán en el PDF.");
      respuesta.archivos.push({ path, leidoCon, albaranes: await guardarAlbaranes(sb, leidos, "pdf", path) });
    } catch (e) {
      // Los errores de Supabase no son `Error`, pero traen `message`
      const mensaje = e && typeof e === "object" && "message" in e ? String(e.message) : "Error al leer el PDF";
      console.error("Importar albarán", path, e);
      respuesta.archivos.push({ path, error: mensaje, albaranes: [] });
    }
  }
  return NextResponse.json(respuesta);
}
