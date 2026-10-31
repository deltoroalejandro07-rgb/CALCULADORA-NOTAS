import type { Metadata } from "next";
import { Suspense } from "react";
import { Cabecera, Cargando } from "@/components/app/piezas";
import { Agenda, type EventoAgenda } from "@/components/agenda/agenda";
import { usuarioActual } from "@/lib/auth";
import { fechaDentroDe } from "@/lib/dominio/visita";
import { supabaseServidor } from "@/lib/supabase/servidor";

export const metadata: Metadata = { title: "Agenda" };

const sumar = (d: string, n: number) => new Date(Date.parse(d + "T12:00:00Z") + n * 86_400_000).toISOString().slice(0, 10);
/** Lunes de la semana de ese día. */
const lunesDe = (d: string) => sumar(d, -((new Date(d + "T12:00:00Z").getUTCDay() + 6) % 7));

export default function PaginaAgenda({ searchParams }: PageProps<"/agenda">) {
  return (
    <>
      <Cabecera titulo="Agenda" subtitulo="Reuniones, tareas y notas" />
      <Suspense fallback={<Cargando />}>
        {searchParams.then((sp) => (
          <Contenido dia={typeof sp.dia === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.dia) ? sp.dia : null} />
        ))}
      </Suspense>
    </>
  );
}

async function Contenido({ dia }: { dia: string | null }) {
  await usuarioActual();
  const hoy = fechaDentroDe(0);
  const elegido = dia ?? hoy;
  const lunes = lunesDe(elegido);
  const sb = await supabaseServidor();
  const campos = "id, tipo, titulo, fecha, hora_inicio, hora_fin, lugar, cliente_id, notas, hecha, clientes(nombre_negocio)";
  const [{ data: semana }, { data: notas }, { data: pendientes }, { data: clientes }] = await Promise.all([
    sb.from("agenda").select(campos).gte("fecha", lunes).lte("fecha", sumar(lunes, 6)).neq("tipo", "nota").order("hora_inicio", { nullsFirst: true }),
    sb.from("agenda").select(campos).eq("tipo", "nota").order("actualizado_at", { ascending: false }).limit(200),
    sb.from("agenda").select(campos).eq("tipo", "tarea").eq("hecha", false).lt("fecha", hoy).order("fecha"),
    sb.from("clientes").select("id, nombre_negocio").order("nombre_negocio"),
  ]);
  const aEvento = (e: NonNullable<typeof semana>[number]): EventoAgenda => ({
    id: e.id,
    tipo: e.tipo as EventoAgenda["tipo"],
    titulo: e.titulo,
    fecha: e.fecha,
    hora_inicio: e.hora_inicio?.slice(0, 5) ?? null,
    hora_fin: e.hora_fin?.slice(0, 5) ?? null,
    lugar: e.lugar,
    cliente_id: e.cliente_id,
    cliente: e.clientes?.nombre_negocio ?? null,
    notas: e.notas,
    hecha: e.hecha,
  });
  return (
    <Agenda
      dia={elegido}
      hoy={hoy}
      lunes={lunes}
      semana={(semana ?? []).map(aEvento)}
      notas={(notas ?? []).map(aEvento)}
      atrasadas={(pendientes ?? []).map(aEvento)}
      clientes={(clientes ?? []).map((c) => ({ id: c.id, nombre: c.nombre_negocio }))}
    />
  );
}
