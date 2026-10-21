import { NextResponse } from "next/server";
import { supabaseServidor } from "@/lib/supabase/servidor";

// Derecho de acceso y portabilidad (RGPD): todos los datos de un cliente en JSON.
// RLS limita el acceso a quien puede ver al cliente.
export async function GET(_: Request, ctx: RouteContext<"/api/rgpd/[clienteId]">) {
  const { clienteId } = await ctx.params;
  const sb = await supabaseServidor();
  const { data: cliente } = await sb.from("clientes").select("*").eq("id", clienteId).maybeSingle();
  if (!cliente) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const [intereses, visitas, mensajes, pedidos, consentimientos] = await Promise.all([
    sb.from("cliente_productos_interes").select("creado_at, productos(nombre, formato)").eq("cliente_id", clienteId),
    sb.from("visitas").select("*, visita_productos(relacion, productos(nombre)), visita_fotos(storage_path, tipo, creado_at)").eq("cliente_id", clienteId).order("fecha"),
    sb.from("mensajes").select("*").eq("cliente_id", clienteId).order("creado_at"),
    sb.from("pedidos").select("*, pedido_lineas(*)").eq("cliente_id", clienteId).order("fecha"),
    sb.from("consentimientos").select("*").eq("cliente_id", clienteId).order("registrado_at"),
  ]);

  const nombre = cliente.nombre_negocio.normalize("NFD").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
  return new NextResponse(
    JSON.stringify(
      {
        exportado_at: new Date().toISOString(),
        cliente,
        productos_de_interes: intereses.data,
        visitas: visitas.data,
        mensajes: mensajes.data,
        pedidos: pedidos.data,
        consentimientos: consentimientos.data,
      },
      null,
      2,
    ),
    {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="datos-${nombre || "cliente"}.json"`,
        "Cache-Control": "no-store",
      },
    },
  );
}
