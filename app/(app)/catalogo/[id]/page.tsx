import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Cabecera, Cargando } from "@/components/app/piezas";
import { FormularioProducto } from "@/components/catalogo/formulario-producto";
import { exigirAdmin } from "@/lib/auth";
import { urlImagenProducto } from "@/lib/datos/segmento";
import { supabaseServidor } from "@/lib/supabase/servidor";

export const metadata: Metadata = { title: "Producto" };

export default function PaginaProducto({ params }: PageProps<"/catalogo/[id]">) {
  return (
    <>
      <Link href="/catalogo" className="inline-flex min-h-11 items-center gap-1 px-3 pt-3 text-sm text-suave">
        <ChevronLeft className="h-5 w-5" aria-hidden /> Catálogo
      </Link>
      <Suspense fallback={<Cargando />}>
        {params.then(({ id }) => (
          <Contenido id={id} />
        ))}
      </Suspense>
    </>
  );
}

async function Contenido({ id }: { id: string }) {
  await exigirAdmin();
  if (id === "nuevo") {
    return (
      <>
        <Cabecera titulo="Nuevo producto" />
        <FormularioProducto />
      </>
    );
  }
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const sb = await supabaseServidor();
  const { data: p } = await sb.from("productos").select("*").eq("id", id).maybeSingle();
  if (!p) notFound();
  return (
    <>
      <Cabecera titulo="Editar producto" />
      <FormularioProducto inicial={{ ...p, precio_tarifa: Number(p.precio_tarifa) }} urlImagen={urlImagenProducto(p.imagen_path)} />
    </>
  );
}
