import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Cabecera, Cargando } from "@/components/app/piezas";
import { FormularioCliente } from "@/components/clientes/formulario-cliente";
import { usuarioActual } from "@/lib/auth";
import { listaComerciales } from "@/lib/datos/comerciales";
import { supabaseServidor } from "@/lib/supabase/servidor";

export const metadata: Metadata = { title: "Editar cliente" };

export default function PaginaEditar({ params }: PageProps<"/clientes/[id]/editar">) {
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
  const usuario = await usuarioActual();
  const sb = await supabaseServidor();
  const { data: c } = await sb.from("clientes").select("*").eq("id", id).maybeSingle();
  if (!c) notFound();
  const esAdmin = usuario.rol === "admin";
  const comerciales = esAdmin ? await listaComerciales() : [];
  return (
    <>
      <Link href={`/clientes/${id}`} className="inline-flex min-h-11 items-center gap-1 px-3 pt-3 text-sm text-suave">
        <ChevronLeft className="h-5 w-5" aria-hidden /> {c.nombre_negocio}
      </Link>
      <Cabecera titulo="Editar cliente" />
      <FormularioCliente inicial={{ ...c, volumen_estimado_eur: c.volumen_estimado_eur != null ? Number(c.volumen_estimado_eur) : null }} comerciales={comerciales} esAdmin={esAdmin} />
    </>
  );
}
