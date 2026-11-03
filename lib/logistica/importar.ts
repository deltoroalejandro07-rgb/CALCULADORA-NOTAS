import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { claveDestino, elegirZona } from "@/lib/dominio/destinos";
import { interpretarHorario } from "@/lib/dominio/horario";
import type { Database } from "@/lib/supabase/tipos-bd";
import type { AlbaranLeido } from "./holded-pdf";
import { ubicarDireccion } from "./mapas";

type Cliente = SupabaseClient<Database>;

export interface ResultadoImportacion {
  numero: string | null;
  cliente: string;
  destinoId: string;
  albaranId: string | null;
  repetido: boolean;
  /** Ya estaba subido y ENTREGADO o en una ruta: se puede volver a poner «por repartir». */
  existente?: { id: string; estado: "planificado" | "entregado" };
  avisos: string[];
}

/**
 * Guarda los albaranes leídos: reconoce el destino si ya existía (y reutiliza su ubicación y
 * horario), le asigna zona por el campo «Ruta», lo sitúa en el mapa y no duplica albaranes.
 */
export async function guardarAlbaranes(sb: Cliente, leidos: AlbaranLeido[], origen: "pdf" | "manual", archivo: string | null): Promise<ResultadoImportacion[]> {
  const { data: zonas } = await sb.from("zonas_reparto").select("id, nombre").eq("activa", true);
  const resultados: ResultadoImportacion[] = [];

  for (const a of leidos) {
    const avisos: string[] = [];
    const clave = claveDestino(a.cliente, a.direccion, a.codigo_postal);
    const franja = interpretarHorario(a.horario);
    const zona = elegirZona(a.ruta, zonas ?? []);
    if (a.horario && !franja) avisos.push(`Horario «${a.horario}» sin interpretar: fíjalo a mano.`);
    if (a.ruta && !zona) avisos.push(`La ruta «${a.ruta}» no coincide con ninguna zona.`);

    let { data: destino } = await sb.from("destinos").select("*").eq("clave", clave).maybeSingle();
    if (!destino) {
      const { data, error } = await sb
        .from("destinos")
        .insert({
          nombre: a.cliente,
          direccion: a.direccion,
          localidad: a.localidad,
          codigo_postal: a.codigo_postal,
          telefono: a.telefono,
          zona_id: zona?.id ?? null,
          ventana_desde: franja?.desde ?? null,
          ventana_hasta: franja?.hasta ?? null,
          horario_texto: a.horario,
          clave,
        })
        .select("*")
        .single();
      if (error) throw error;
      destino = data;
    } else {
      // Ya conocido: solo se completa lo que falte (lo fijado a mano en la oficina manda)
      const cambios: Database["public"]["Tables"]["destinos"]["Update"] = {};
      if (!destino.zona_id && zona) cambios.zona_id = zona.id;
      if (!destino.ventana_desde && !destino.ventana_hasta && franja) {
        cambios.ventana_desde = franja.desde;
        cambios.ventana_hasta = franja.hasta;
        cambios.horario_texto = a.horario;
      }
      if (!destino.telefono && a.telefono) cambios.telefono = a.telefono;
      if (Object.keys(cambios).length) {
        const { data } = await sb.from("destinos").update({ ...cambios, actualizado_at: new Date().toISOString() }).eq("id", destino.id).select("*").single();
        if (data) destino = data;
      }
    }

    if (destino.lat == null && (destino.direccion || destino.localidad)) {
      const punto = await ubicarDireccion(destino);
      if (punto) {
        await sb.from("destinos").update({ lat: punto.lat, lng: punto.lng, ubicacion_origen: "direccion" }).eq("id", destino.id);
        destino = { ...destino, lat: punto.lat, lng: punto.lng };
      }
    }
    if (destino.lat == null) avisos.push("Sin ubicación en el mapa: revisa la dirección.");
    if (!destino.zona_id && !zona) avisos.push("Sin zona asignada.");

    const fila: Database["public"]["Tables"]["albaranes"]["Insert"] = {
      numero: a.numero,
      fecha: a.fecha,
      destino_id: destino.id,
      lineas: a.lineas as unknown as Database["public"]["Tables"]["albaranes"]["Insert"]["lineas"],
      notas: a.notas,
      origen,
      archivo_path: archivo,
    };
    const { data: nuevo, error } = a.numero
      ? await sb.from("albaranes").upsert(fila, { onConflict: "numero", ignoreDuplicates: true }).select("id")
      : await sb.from("albaranes").insert(fila).select("id");
    if (error) throw error;
    const repetido = !nuevo?.length;
    let existente: ResultadoImportacion["existente"];
    if (repetido && a.numero) {
      // Ya estaba: si sigue pendiente, se actualiza con la nueva lectura (p. ej. cantidades corregidas)
      const { data: act } = await sb
        .from("albaranes")
        .update({ lineas: fila.lineas, notas: fila.notas, fecha: fila.fecha, destino_id: destino.id })
        .eq("numero", a.numero)
        .eq("estado", "pendiente")
        .select("id");
      if (act?.length) avisos.unshift("Ya estaba subido: se actualiza con esta lectura (sigue por repartir).");
      else {
        // Dónde está: en una ruta o ya entregado (por eso no sale en «Por repartir»)
        const { data: ex } = await sb.from("albaranes").select("id, estado, paradas(rutas(fecha))").eq("numero", a.numero).maybeSingle();
        const fechas = ((ex?.paradas ?? []) as { rutas: { fecha: string } | null }[]).map((p) => p.rutas?.fecha).filter(Boolean) as string[];
        const dia = fechas.length ? new Date(fechas.sort().at(-1)! + "T12:00:00").toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" }) : null;
        if (ex && (ex.estado === "entregado" || ex.estado === "planificado")) existente = { id: ex.id, estado: ex.estado };
        avisos.unshift(
          ex?.estado === "entregado"
            ? `Ya estaba subido y marcado ENTREGADO${dia ? ` (ruta del ${dia})` : ""}. Si no se entregó, pulsa «Leerlo igualmente».`
            : `Ya estaba subido y está en una ruta${dia ? ` (la del ${dia})` : ""}. Si quieres repartirlo otro día, pulsa «Leerlo igualmente».`,
        );
      }
    }
    resultados.push({ numero: a.numero, cliente: a.cliente, destinoId: destino.id, albaranId: nuevo?.[0]?.id ?? null, repetido, existente, avisos });
  }
  return resultados;
}
