import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Cabecera, Cargando } from "@/components/app/piezas";
import { Planificador } from "@/components/logistica/planificador";
import { exigirAdmin } from "@/lib/auth";
import { diaSemana } from "@/lib/dominio/destinos";
import { fechaDentroDe } from "@/lib/dominio/visita";
import { supabaseServidor } from "@/lib/supabase/servidor";

export const metadata: Metadata = { title: "Planificar reparto" };

// Calcular la ruta puede tardar unos segundos con muchas paradas
export const maxDuration = 60;

export default function PaginaPlanificar({ searchParams }: PageProps<"/logistica/planificar">) {
  return (
    <>
      <Link href="/logistica" className="inline-flex min-h-11 items-center gap-1 px-3 pt-3 text-sm text-suave">
        <ChevronLeft className="h-5 w-5" aria-hidden /> Logística
      </Link>
      <Cabecera titulo="Planificar reparto" subtitulo="La ruta más rápida y con menos kilómetros" />
      <Suspense fallback={<Cargando />}>
        {searchParams.then((sp) => (
          <Contenido fecha={typeof sp.fecha === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.fecha) ? sp.fecha : fechaDentroDe(1)} />
        ))}
      </Suspense>
    </>
  );
}

async function Contenido({ fecha }: { fecha: string }) {
  await exigirAdmin();
  const sb = await supabaseServidor();
  const [{ data: zonas }, { data: albaranes }, { data: vehiculos }, { data: perfiles }, { data: aj }] = await Promise.all([
    sb.from("zonas_reparto").select("id, nombre, dias, vehiculo_id").eq("activa", true).order("nombre"),
    sb.from("albaranes").select("id, numero, lineas, destinos(id, nombre, localidad, zona_id, lat)").eq("estado", "pendiente").order("creado_at"),
    sb.from("vehiculos").select("id, nombre, matricula, capacidad_bultos, conductor_habitual").eq("activo", true).order("nombre"),
    sb.from("perfiles").select("id, nombre").eq("activo", true).order("nombre"),
    sb.from("ajustes_logistica").select("almacen_lat, almacen_lng, hora_salida").single(),
  ]);
  return (
    <Planificador
      fecha={fecha}
      dia={diaSemana(fecha)}
      zonas={zonas ?? []}
      albaranes={(albaranes ?? [])
        .filter((a) => a.destinos)
        .map((a) => ({
          id: a.id,
          numero: a.numero,
          nombre: a.destinos!.nombre,
          localidad: a.destinos!.localidad,
          zonaId: a.destinos!.zona_id,
          ubicado: a.destinos!.lat != null,
          lineas: ((a.lineas as { descripcion: string; cantidad: number }[] | null) ?? []).map((l) => ({ descripcion: l.descripcion, cantidad: Number(l.cantidad) })),
        }))}
      vehiculos={vehiculos ?? []}
      conductores={perfiles ?? []}
      almacen={aj?.almacen_lat != null && aj?.almacen_lng != null ? { lat: aj.almacen_lat, lng: aj.almacen_lng } : null}
    />
  );
}
