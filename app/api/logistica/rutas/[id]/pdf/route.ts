import { NextResponse } from "next/server";
import { DIAS_SEMANA, diaSemana } from "@/lib/dominio/destinos";
import { textoFranja } from "@/lib/dominio/horario";
import { totalCarga } from "@/lib/dominio/reparto";
import { fecha } from "@/lib/formato";
import { pdfHojaRuta } from "@/lib/logistica/pdf-ruta";
import { supabaseServidor } from "@/lib/supabase/servidor";

// PDF de la hoja de ruta (hoja de carga + orden de reparto). La ven la oficina y el
// conductor de la ruta (lo filtra RLS).
export async function GET(_: Request, ctx: RouteContext<"/api/logistica/rutas/[id]/pdf">) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  const sb = await supabaseServidor();
  const { data: r } = await sb
    .from("rutas")
    .select(
      "fecha, notas, vehiculos(nombre, matricula), conductor:perfiles!rutas_conductor_id_fkey(nombre), paradas(orden, estado, notas_oficina, llegada_prevista, clientes(nombre_negocio, direccion, localidad, telefono, clientes_entrega(horario_entrega, notas_acceso)), destinos(nombre, direccion, localidad, codigo_postal, telefono, horario_texto, ventana_desde, ventana_hasta, notas_acceso), albaranes(numero, lineas), pedidos(pedido_lineas(producto_id, descripcion, cantidad)))",
    )
    .eq("id", id)
    .maybeSingle();
  if (!r) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const paradas = [...r.paradas]
    .sort((a, b) => a.orden - b.orden)
    .map((p) => {
      const lineas = p.pedidos
        ? p.pedidos.pedido_lineas.map((l) => ({ producto_id: l.producto_id, descripcion: l.descripcion, cantidad: Number(l.cantidad) }))
        : ((p.albaranes?.lineas as { descripcion: string; cantidad: number }[] | null) ?? []).map((l) => ({ producto_id: null, descripcion: l.descripcion, cantidad: Number(l.cantidad) }));
      const c = p.clientes;
      const d = p.destinos;
      return {
        estado: p.estado,
        lineas,
        hoja: {
          hora: p.llegada_prevista?.slice(0, 5) ?? null,
          cliente: c?.nombre_negocio ?? d?.nombre ?? "—",
          direccion: (c ? [c.direccion, c.localidad] : [d?.direccion, d?.codigo_postal, d?.localidad]).filter(Boolean).join(", "),
          telefono: c?.telefono ?? d?.telefono ?? null,
          horario: c ? (c.clientes_entrega?.horario_entrega ?? null) : (d?.horario_texto ?? textoFranja(d?.ventana_desde ?? null, d?.ventana_hasta ?? null)),
          acceso: c ? (c.clientes_entrega?.notas_acceso ?? null) : (d?.notas_acceso ?? null),
          notas: p.notas_oficina,
          albaran: p.albaranes?.numero ?? null,
          lineas: lineas.map((l) => `${l.cantidad.toLocaleString("es-ES")} x ${l.descripcion}`),
        },
      };
    });

  const vehiculo = [r.vehiculos?.nombre ?? "Sin vehículo", r.vehiculos?.matricula].filter(Boolean).join(" · ");
  const pdf = await pdfHojaRuta({
    fecha: `${DIAS_SEMANA[diaSemana(r.fecha) - 1].largo} ${fecha(r.fecha)}`,
    vehiculo,
    conductor: r.conductor?.nombre ?? "—",
    resumen: r.notas?.replace(/^Ruta calculada:\s*/, "") ?? null,
    // La carga es lo que aún hay que entregar (si la ruta ya ha empezado, no cuenta lo entregado)
    carga: totalCarga(paradas.filter((p) => p.estado === "pendiente")).map((l) => ({ descripcion: l.descripcion, cantidad: l.cantidad })),
    paradas: paradas.map((p) => p.hoja),
  });
  const nombre = `ruta-${r.fecha}-${(r.vehiculos?.nombre ?? "reparto").normalize("NFD").replace(/[^\w]+/g, "-").toLowerCase()}.pdf`;
  return new NextResponse(Buffer.from(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${nombre}"`, "Cache-Control": "no-store" },
  });
}
