import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Cabecera, Cargando } from "@/components/app/piezas";
import { EnvioIndividual } from "@/components/mensajes/envio-individual";
import { usuarioActual } from "@/lib/auth";
import { datosParaMensajes } from "@/lib/datos/mensajeria";
import { supabaseServidor } from "@/lib/supabase/servidor";

export const metadata: Metadata = { title: "Enviar mensaje" };

export default function PaginaEnviar({ searchParams }: PageProps<"/mensajes/enviar">) {
  return (
    <Suspense fallback={<Cargando />}>
      {searchParams.then((sp) => (
        <Contenido clienteId={String(sp.cliente ?? "")} />
      ))}
    </Suspense>
  );
}

async function Contenido({ clienteId }: { clienteId: string }) {
  if (!/^[0-9a-f-]{36}$/i.test(clienteId)) notFound();
  const usuario = await usuarioActual();
  const sb = await supabaseServidor();
  const [{ data: c }, datos] = await Promise.all([
    sb.from("clientes").select("id, nombre_negocio, contacto_nombre, telefono, email, consiente_whatsapp, consiente_email").eq("id", clienteId).maybeSingle(),
    datosParaMensajes(),
  ]);
  if (!c) notFound();
  return (
    <>
      <Link href={`/clientes/${c.id}`} className="inline-flex min-h-11 items-center gap-1 px-3 pt-3 text-sm text-suave">
        <ChevronLeft className="h-5 w-5" aria-hidden /> {c.nombre_negocio}
      </Link>
      <Cabecera titulo="Enviar mensaje" subtitulo={c.nombre_negocio} />
      <EnvioIndividual cliente={c} comercial={usuario.nombre} plantillas={datos.plantillas} ofertas={[]} ofertaInicial={null} />
    </>
  );
}
