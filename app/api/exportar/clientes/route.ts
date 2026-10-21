import Papa from "papaparse";
import writeExcelFile from "write-excel-file/node";
import { NextResponse, type NextRequest } from "next/server";
import { TEXTO_ESTADO, TEXTO_TIPO_NEGOCIO } from "@/lib/dominio/tipos";
import { fecha } from "@/lib/formato";
import { supabaseServidor } from "@/lib/supabase/servidor";

// Exporta los clientes visibles (RLS) en CSV (separado por «;», abre bien en Excel en español) o XLSX.
export async function GET(request: NextRequest) {
  const formato = request.nextUrl.searchParams.get("formato") === "xlsx" ? "xlsx" : "csv";
  const sb = await supabaseServidor();
  const { data, error } = await sb
    .from("clientes")
    .select("*, comercial:perfiles!clientes_comercial_id_fkey(nombre), cliente_productos_interes(productos(nombre))")
    .order("nombre_negocio");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  type Fila = NonNullable<typeof data>[number];

  const columnas: [string, (c: Fila) => string | number | null][] = [
    ["Nombre del negocio", (c) => c.nombre_negocio],
    ["Tipo", (c) => TEXTO_TIPO_NEGOCIO[c.tipo]],
    ["Estado", (c) => TEXTO_ESTADO[c.estado]],
    ["Persona de contacto", (c) => c.contacto_nombre],
    ["Cargo", (c) => c.contacto_cargo],
    ["Teléfono", (c) => c.telefono],
    ["Email", (c) => c.email],
    ["Dirección", (c) => c.direccion],
    ["Localidad", (c) => c.localidad],
    ["Código postal", (c) => c.codigo_postal],
    ["Zona", (c) => c.zona],
    ["Latitud", (c) => c.lat],
    ["Longitud", (c) => c.lng],
    ["Horario de visita", (c) => c.horario_visita],
    ["Comercial", (c) => c.comercial?.nombre ?? null],
    ["Proveedor actual", (c) => c.proveedor_actual],
    ["Volumen €/mes", (c) => (c.volumen_estimado_eur != null ? Number(c.volumen_estimado_eur) : null)],
    ["Productos de interés", (c) => c.cliente_productos_interes.map((p) => p.productos?.nombre).join(", ")],
    ["Etiquetas", (c) => c.etiquetas.join(", ")],
    ["Acepta WhatsApp", (c) => (c.consiente_whatsapp ? "Sí" : "No")],
    ["Acepta email", (c) => (c.consiente_email ? "Sí" : "No")],
    ["Fecha consentimiento", (c) => (c.consentimiento_at ? fecha(c.consentimiento_at) : null)],
    ["Última visita", (c) => (c.ultima_visita_at ? fecha(c.ultima_visita_at) : null)],
    ["Próxima acción", (c) => c.proxima_accion],
    ["Fecha próxima acción", (c) => (c.proxima_accion_fecha ? fecha(c.proxima_accion_fecha) : null)],
    ["Notas", (c) => c.notas],
    ["Motivo pérdida", (c) => c.motivo_perdida],
    ["Alta", (c) => fecha(c.creado_at)],
    ["Datos de ejemplo", (c) => (c.is_seed ? "Sí" : "No")],
    ["ID", (c) => c.id],
  ];

  const nombre = `clientes-${new Date().toISOString().slice(0, 10)}`;
  if (formato === "xlsx") {
    const hoja = [
      columnas.map(([titulo]) => ({ value: titulo, fontWeight: "bold" as const })),
      ...data.map((c) => columnas.map(([, f]) => ({ value: f(c) ?? "" }))),
    ];
    const buffer = await writeExcelFile(hoja).toBuffer();
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${nombre}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  }
  const csv = Papa.unparse({ fields: columnas.map(([t]) => t), data: data.map((c) => columnas.map(([, f]) => f(c) ?? "")) }, { delimiter: ";" });
  return new NextResponse("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nombre}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
