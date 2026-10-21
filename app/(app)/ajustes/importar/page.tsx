import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Cabecera, Cargando } from "@/components/app/piezas";
import { Importador } from "@/components/ajustes/importador";
import { exigirAdmin } from "@/lib/auth";
import { listaComerciales } from "@/lib/datos/comerciales";
import { supabaseServidor } from "@/lib/supabase/servidor";

export const metadata: Metadata = { title: "Importar y exportar" };

export default function PaginaImportar() {
  return (
    <>
      <Link href="/mas" className="inline-flex min-h-11 items-center gap-1 px-3 pt-3 text-sm text-suave">
        <ChevronLeft className="h-5 w-5" aria-hidden /> Más
      </Link>
      <Cabecera titulo="Importar y exportar" subtitulo="Clientes en Excel o CSV" />
      <Suspense fallback={<Cargando />}>
        <Contenido />
      </Suspense>
    </>
  );
}

async function Contenido() {
  const yo = await exigirAdmin();
  const sb = await supabaseServidor();
  const [comerciales, { data: existentes }] = await Promise.all([listaComerciales(), sb.from("clientes").select("nombre_negocio, telefono")]);
  return <Importador comerciales={comerciales} yo={yo.id} existentes={existentes ?? []} />;
}
