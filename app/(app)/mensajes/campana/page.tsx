import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Cabecera, Cargando } from "@/components/app/piezas";
import { Campana } from "@/components/mensajes/campana";
import { usuarioActual } from "@/lib/auth";
import { datosParaMensajes } from "@/lib/datos/mensajeria";
import { clientesParaSegmentar } from "@/lib/datos/segmento";

export const metadata: Metadata = { title: "Campaña" };

export default function PaginaCampana({ searchParams }: PageProps<"/mensajes/campana">) {
  return (
    <>
      <Link href="/mensajes" className="inline-flex min-h-11 items-center gap-1 px-3 pt-3 text-sm text-suave">
        <ChevronLeft className="h-5 w-5" aria-hidden /> Mensajes
      </Link>
      <Cabecera titulo="Campaña" subtitulo="Un mensaje personalizado para cada cliente" />
      <Suspense fallback={<Cargando />}>
        {searchParams.then((sp) => (
          <Contenido ofertaId={sp.oferta ? String(sp.oferta) : null} />
        ))}
      </Suspense>
    </>
  );
}

async function Contenido({ ofertaId }: { ofertaId: string | null }) {
  const [usuario, clientes, datos] = await Promise.all([usuarioActual(), clientesParaSegmentar(), datosParaMensajes()]);
  return <Campana clientes={clientes} plantillas={datos.plantillas} ofertas={datos.ofertas} comercial={usuario.nombre} ofertaInicial={ofertaId} esAdmin={usuario.rol === "admin"} />;
}
