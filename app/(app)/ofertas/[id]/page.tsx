import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Cabecera, Cargando } from "@/components/app/piezas";
import { FormularioOferta } from "@/components/ofertas/formulario-oferta";
import { exigirAdmin } from "@/lib/auth";
import { clientesParaSegmentar } from "@/lib/datos/segmento";
import { supabaseServidor } from "@/lib/supabase/servidor";

export const metadata: Metadata = { title: "Oferta" };

export default function PaginaOferta({ params }: PageProps<"/ofertas/[id]">) {
  return (
    <>
      <Link href="/ofertas" className="inline-flex min-h-11 items-center gap-1 px-3 pt-3 text-sm text-suave">
        <ChevronLeft className="h-5 w-5" aria-hidden /> Ofertas
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
  const nueva = id === "nueva";
  if (!nueva && !/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const sb = await supabaseServidor();
  const [{ data: productos }, clientes, oferta] = await Promise.all([
    sb.from("productos").select("id, nombre, formato").eq("activo", true).order("nombre"),
    clientesParaSegmentar(),
    nueva ? Promise.resolve({ data: null }) : sb.from("ofertas").select("*, oferta_productos(producto_id)").eq("id", id).maybeSingle(),
  ]);
  if (!nueva && !oferta.data) notFound();
  const zonas = [...new Set(clientes.map((c) => c.zona).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, "es"));
  return (
    <>
      <Cabecera titulo={nueva ? "Nueva oferta" : "Editar oferta"} />
      <FormularioOferta
        inicial={oferta.data ? { ...oferta.data, descuento_pct: oferta.data.descuento_pct != null ? Number(oferta.data.descuento_pct) : null, productos: oferta.data.oferta_productos.map((p) => p.producto_id) } : null}
        productos={productos ?? []}
        clientes={clientes.map((c) => ({ tipo: c.tipo, zona: c.zona, estado: c.estado, intereses: c.intereses, consiente_whatsapp: c.consiente_whatsapp }))}
        zonas={zonas}
      />
    </>
  );
}
