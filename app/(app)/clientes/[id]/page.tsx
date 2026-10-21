import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Cargando } from "@/components/app/piezas";
import { FichaCliente } from "@/components/clientes/ficha";
import { usuarioActual } from "@/lib/auth";
import { cargarFicha } from "@/lib/datos/ficha";

export const metadata: Metadata = { title: "Ficha de cliente" };

export default function PaginaFicha({ params }: PageProps<"/clientes/[id]">) {
  return (
    <>
      <Link href="/clientes" className="inline-flex min-h-11 items-center gap-1 px-3 pt-3 text-sm text-suave">
        <ChevronLeft className="h-5 w-5" aria-hidden /> Clientes
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
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [usuario, ficha] = await Promise.all([usuarioActual(), cargarFicha(id)]);
  if (!ficha) notFound();
  return <FichaCliente ficha={ficha} esAdmin={usuario.rol === "admin"} />;
}
