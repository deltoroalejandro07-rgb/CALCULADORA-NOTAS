import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Cabecera, Cargando } from "@/components/app/piezas";
import { AltaManual, ListaAlbaranes, SubirAlbaranes, VaciarAlbaranes, type AlbaranPendiente } from "@/components/logistica/albaranes";
import { BarraDia, PasosReparto } from "@/components/logistica/pasos";
import { VolverAEmpezar } from "@/components/logistica/volver-a-empezar";
import { diaDeReparto } from "@/lib/dia-reparto";
import { fechaDentroDe } from "@/lib/dominio/visita";
import { exigirAdmin } from "@/lib/auth";
import { supabaseServidor } from "@/lib/supabase/servidor";

export const metadata: Metadata = { title: "Albaranes por repartir" };

export default function PaginaAlbaranes({ searchParams }: PageProps<"/logistica/albaranes">) {
  return (
    <>
      <Cabecera titulo="Albaranes" subtitulo="Paso 1: sube los PDF de Holded y revisa zonas y direcciones" />
      <Suspense fallback={<Cargando />}>
        {searchParams.then((sp) => (
          <Contenido param={sp.fecha} />
        ))}
      </Suspense>
    </>
  );
}

async function Contenido({ param }: { param: unknown }) {
  const fecha = await diaDeReparto(param, fechaDentroDe(0));
  await exigirAdmin();
  const sb = await supabaseServidor();
  const hace30 = `${fechaDentroDe(-30)}T00:00:00`;
  const campos = "id, numero, fecha, lineas, notas, origen, estado, creado_at, destinos(*)";
  const [{ data: activos }, { data: entregados }, { data: zonas }, { data: destinos }] = await Promise.all([
    sb.from("albaranes").select(campos).in("estado", ["pendiente", "planificado"]).order("creado_at", { ascending: false }),
    sb.from("albaranes").select(campos).eq("estado", "entregado").gte("creado_at", hace30).order("creado_at", { ascending: false }).limit(300),
    sb.from("zonas_reparto").select("id, nombre, dias").eq("activa", true).order("nombre"),
    sb.from("destinos").select("id, nombre, direccion, localidad").order("nombre"),
  ]);
  const lista: AlbaranPendiente[] = [...(activos ?? []), ...(entregados ?? [])]
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
    <BarraDia fecha={fecha} />
    <PasosReparto actual={1} fecha={fecha} />
    <div className="space-y-4 px-4 pb-8">
      <SubirAlbaranes />
      <AltaManual destinos={destinos ?? []} zonas={zonas ?? []} />
      <ListaAlbaranes albaranes={lista} zonas={zonas ?? []} />
      <VolverAEmpezar fecha={fecha} rutas={0} textoDia={textoDia(fecha)} />
      <VaciarAlbaranes />
    </div>
    {pendientes > 0 && (
      <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 px-4 pb-3 lg:bottom-4">
        <Link
          href={`/logistica/planificar?fecha=${fecha}`}
          className="flex min-h-12 items-center justify-center gap-2 rounded-lg bg-marca px-4 font-semibold text-marca-texto shadow-lg shadow-marca/25 hover:brightness-110"
        >
          Siguiente: preparar la ruta ({pendientes}) <ChevronRight className="h-5 w-5" aria-hidden />
        </Link>
      </div>
    )}
    </>
  );
}

function textoDia(f: string) {
  const hoy = fechaDentroDe(0);
  const manana = new Date(Date.parse(hoy + "T12:00:00Z") + 86_400_000).toISOString().slice(0, 10);
  if (f === hoy) return "hoy";
  if (f === manana) return "mañana";
  return new Date(f + "T12:00:00").toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
}
