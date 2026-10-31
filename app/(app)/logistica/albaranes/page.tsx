import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Cabecera, Cargando } from "@/components/app/piezas";
import { AltaManual, ListaAlbaranes, SubirAlbaranes, type AlbaranPendiente } from "@/components/logistica/albaranes";
import { exigirAdmin } from "@/lib/auth";
import { supabaseServidor } from "@/lib/supabase/servidor";

export const metadata: Metadata = { title: "Albaranes por repartir" };

export default function PaginaAlbaranes() {
  return (
    <>
      <Link href="/logistica" className="inline-flex min-h-11 items-center gap-1 px-3 pt-3 text-sm text-suave">
        <ChevronLeft className="h-5 w-5" aria-hidden /> Logística
      </Link>
      <Cabecera titulo="Albaranes" subtitulo="Sube los PDF de Holded o añade entregas a mano" />
      <Suspense fallback={<Cargando />}>
        <Contenido />
      </Suspense>
    </>
  );
}

async function Contenido() {
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
  return (
    <div className="space-y-4 px-4 pb-8">
      <SubirAlbaranes />
      <AltaManual destinos={destinos ?? []} zonas={zonas ?? []} />
      <ListaAlbaranes albaranes={lista} zonas={zonas ?? []} />
    </div>
  );
}
