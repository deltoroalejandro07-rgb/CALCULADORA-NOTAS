import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Cabecera, Cargando } from "@/components/app/piezas";
import { AltaManual, ListaAlbaranes, SubirAlbaranes, VaciarAlbaranes, type AlbaranPendiente } from "@/components/logistica/albaranes";
import { PasosReparto } from "@/components/logistica/pasos";
import { exigirAdmin } from "@/lib/auth";
import { supabaseServidor } from "@/lib/supabase/servidor";

export const metadata: Metadata = { title: "Albaranes por repartir" };

export default function PaginaAlbaranes({ searchParams }: PageProps<"/logistica/albaranes">) {
  return (
    <>
      <Link href="/logistica" className="inline-flex min-h-11 items-center gap-1 px-3 pt-3 text-sm text-suave">
        <ChevronLeft className="h-5 w-5" aria-hidden /> Reparto
      </Link>
      <Cabecera titulo="Albaranes" subtitulo="Paso 1: sube los PDF de Holded y revisa zonas y direcciones" />
      <Suspense fallback={<Cargando />}>
        {searchParams.then((sp) => (
          <Contenido fecha={typeof sp.fecha === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.fecha) ? sp.fecha : undefined} />
        ))}
      </Suspense>
    </>
  );
}

async function Contenido({ fecha }: { fecha?: string }) {
  await exigirAdmin();
  const sb = await supabaseServidor();
  const [{ data: albaranes }, { data: zonas }, { data: destinos }] = await Promise.all([
    sb.from("albaranes").select("id, numero, fecha, lineas, notas, origen, estado, creado_at, destinos(*)").in("estado", ["pendiente", "planificado"]).order("creado_at", { ascending: false }),
    sb.from("zonas_reparto").select("id, nombre, dias").eq("activa", true).order("nombre"),
    sb.from("destinos").select("id, nombre, direccion, localidad").order("nombre"),
  ]);
  const lista: AlbaranPendiente[] = (albaranes ?? [])
    .filter((a) => a.destinos)
    .map((a) => ({
      id: a.id,
      numero: a.numero,
      fecha: a.fecha,
      estado: a.estado as AlbaranPendiente["estado"],
      origen: a.origen,
      notas: a.notas,
      lineas: (a.lineas as { descripcion: string; cantidad: number }[]) ?? [],
      destino: a.destinos!,
    }));
  const pendientes = lista.filter((a) => a.estado === "pendiente").length;
  return (
    <>
    <PasosReparto actual={1} fecha={fecha} />
    <div className="space-y-4 px-4 pb-8">
      <SubirAlbaranes />
      <AltaManual destinos={destinos ?? []} zonas={zonas ?? []} />
      <ListaAlbaranes albaranes={lista} zonas={zonas ?? []} />
      <VaciarAlbaranes />
    </div>
    {pendientes > 0 && (
      <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 px-4 pb-3 lg:bottom-4">
        <Link
          href={fecha ? `/logistica/planificar?fecha=${fecha}` : "/logistica/planificar"}
          className="flex min-h-12 items-center justify-center gap-2 rounded-lg bg-marca px-4 font-semibold text-marca-texto shadow-lg shadow-marca/25 hover:brightness-110"
        >
          Siguiente: calcular la ruta ({pendientes}) <ChevronRight className="h-5 w-5" aria-hidden />
        </Link>
      </div>
    )}
    </>
  );
}
