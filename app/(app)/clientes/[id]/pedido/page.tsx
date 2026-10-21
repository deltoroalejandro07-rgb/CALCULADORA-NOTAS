import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Cabecera, Cargando } from "@/components/app/piezas";
import { FormularioPedido } from "@/components/clientes/formulario-pedido";
import { supabaseServidor } from "@/lib/supabase/servidor";

export const metadata: Metadata = { title: "Nuevo pedido" };

export default function PaginaPedido({ params }: PageProps<"/clientes/[id]/pedido">) {
  return (
    <Suspense fallback={<Cargando />}>
      {params.then(({ id }) => (
        <Contenido id={id} />
      ))}
    </Suspense>
  );
}

async function Contenido({ id }: { id: string }) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const sb = await supabaseServidor();
  const [{ data: c }, { data: productos }] = await Promise.all([
    sb.from("clientes").select("id, nombre_negocio").eq("id", id).maybeSingle(),
    sb.from("productos").select("id, nombre, formato, precio_tarifa, destacado, categoria").eq("activo", true).order("nombre"),
  ]);
  if (!c) notFound();
  return (
    <>
      <Link href={`/clientes/${id}`} className="inline-flex min-h-11 items-center gap-1 px-3 pt-3 text-sm text-suave">
        <ChevronLeft className="h-5 w-5" aria-hidden /> {c.nombre_negocio}
      </Link>
      <Cabecera titulo="Nuevo pedido" subtitulo={c.nombre_negocio} />
      <FormularioPedido clienteId={id} productos={(productos ?? []).map((p) => ({ ...p, precio_tarifa: Number(p.precio_tarifa) }))} />
    </>
  );
}
