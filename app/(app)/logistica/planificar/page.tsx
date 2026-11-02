import type { Metadata } from "next";
import { Suspense } from "react";
import { Cabecera, Cargando } from "@/components/app/piezas";
import { BarraDia, PasosReparto } from "@/components/logistica/pasos";
import { RecordarDia } from "@/components/logistica/recordar-dia";
import { diaDeReparto } from "@/lib/dia-reparto";
import { PrepararRuta, type ClienteDelDia } from "@/components/logistica/preparar-ruta";
import { textoFranja } from "@/lib/dominio/horario";
import { exigirAdmin } from "@/lib/auth";
import { diaSemana } from "@/lib/dominio/destinos";
import { fechaDentroDe } from "@/lib/dominio/visita";
import { supabaseServidor } from "@/lib/supabase/servidor";

export const metadata: Metadata = { title: "Preparar la ruta" };


export default function PaginaPlanificar({ searchParams }: PageProps<"/logistica/planificar">) {
  return (
    <>
      <Cabecera titulo="Preparar la ruta" subtitulo="Paso 2: furgoneta, conductor y orden de entrega" />
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
  const [{ data: zonas }, { data: albaranes }, { data: vehiculos }, { data: perfiles }] = await Promise.all([
    sb.from("zonas_reparto").select("id, nombre, dias, vehiculo_id").eq("activa", true).order("nombre"),
    sb
      .from("albaranes")
      .select("id, numero, lineas, destinos(id, nombre, direccion, localidad, telefono, zona_id, ventana_desde, ventana_hasta, horario_texto, notas_acceso, orden_habitual)")
      .eq("estado", "pendiente")
      .order("creado_at"),
    sb.from("vehiculos").select("id, nombre, matricula, conductor_habitual").eq("activo", true).order("nombre"),
    sb.from("perfiles").select("id, nombre").eq("activo", true).order("nombre"),
  ]);
  // Un albarán = una parada (aunque dos albaranes tengan el mismo nombre de cliente)
  const porCliente = new Map<string, ClienteDelDia>();
  for (const a of albaranes ?? []) {
    const d = a.destinos;
    if (!d) continue;
    const c = porCliente.get(a.id) ?? {
      clave: a.id,
      destinoId: d.id,
      nombre: d.nombre,
      direccion: [d.direccion, d.localidad].filter(Boolean).join(", "),
      telefono: d.telefono,
      horario: d.horario_texto ?? textoFranja(d.ventana_desde, d.ventana_hasta),
      observaciones: d.notas_acceso,
      zonaId: d.zona_id,
      ordenHabitual: d.orden_habitual,
      albaranes: [],
    };
    c.albaranes.push({ id: a.id, numero: a.numero, lineas: ((a.lineas as { descripcion: string; cantidad: number }[] | null) ?? []).map((l) => ({ descripcion: l.descripcion, cantidad: Number(l.cantidad) })) });
    porCliente.set(a.id, c);
  }
  return <PrepararRuta fecha={fecha} dia={diaSemana(fecha)} clientes={[...porCliente.values()]} zonas={zonas ?? []} vehiculos={vehiculos ?? []} conductores={perfiles ?? []} />;
}
