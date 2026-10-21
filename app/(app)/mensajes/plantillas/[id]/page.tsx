import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Cabecera, Cargando } from "@/components/app/piezas";
import { FormularioPlantilla } from "@/components/mensajes/formulario-plantilla";
import { exigirAdmin } from "@/lib/auth";
import { supabaseServidor } from "@/lib/supabase/servidor";

export const metadata: Metadata = { title: "Plantilla" };

export default function PaginaPlantilla({ params }: PageProps<"/mensajes/plantillas/[id]">) {
  return (
    <>
      <Link href="/mensajes?tab=plantillas" className="inline-flex min-h-11 items-center gap-1 px-3 pt-3 text-sm text-suave">
        <ChevronLeft className="h-5 w-5" aria-hidden /> Plantillas
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
  const yo = await exigirAdmin();
  if (id === "nueva") {
    return (
      <>
        <Cabecera titulo="Nueva plantilla" />
        <FormularioPlantilla comercial={yo.nombre} />
      </>
    );
  }
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const sb = await supabaseServidor();
  const { data: p } = await sb.from("plantillas").select("*").eq("id", id).maybeSingle();
  if (!p) notFound();
  return (
    <>
      <Cabecera titulo="Editar plantilla" />
      <FormularioPlantilla inicial={p} comercial={yo.nombre} />
    </>
  );
}
