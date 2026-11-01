import type { Metadata } from "next";
import { Suspense } from "react";
import { Cabecera, Cargando } from "@/components/app/piezas";
import { BarraDia, PasosReparto } from "@/components/logistica/pasos";
import { RecordarDia } from "@/components/logistica/recordar-dia";
import { diaDeReparto } from "@/lib/dia-reparto";
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
      <Cabecera titulo="Calcular ruta" subtitulo="Paso 2: la ruta más rápida y con menos kilómetros" />
      <Suspense fallback={<Cargando />}>
        {searchParams.then((sp) => {
          return <ConDia param={sp.fecha} />;
        })}
      </Suspense>
    </>
  );
}

async function ConDia({ param }: { param: unknown }) {
  const fecha = await diaDeReparto(param, fechaDentroDe(0));
  return (
    <>
      <RecordarDia fecha={fecha} />
      <BarraDia fecha={fecha} />
      <PasosReparto actual={2} fecha={fecha} hechos={[1]} />
      <Contenido fecha={fecha} />
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
