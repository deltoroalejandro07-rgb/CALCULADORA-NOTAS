import type { Metadata } from "next";
import { Suspense } from "react";
import { Cabecera, Cargando } from "@/components/app/piezas";
import { ClientesReparto } from "@/components/logistica/clientes-reparto";
import { exigirAdmin } from "@/lib/auth";
import { supabaseServidor } from "@/lib/supabase/servidor";

export const metadata: Metadata = { title: "Clientes de reparto" };

export default function PaginaClientesReparto() {
  return (
    <>
      <Cabecera titulo="Clientes de reparto" subtitulo="Dirección, horario y observaciones para el repartidor. Salen solas en el PDF y en Mi reparto." />
      <Suspense fallback={<Cargando />}>
        <Contenido />
      </Suspense>
    </>
  );
}

async function Contenido() {
  await exigirAdmin();
  const sb = await supabaseServidor();
  const [{ data: destinos }, { data: zonas }] = await Promise.all([
    sb.from("destinos").select("id, nombre, direccion, localidad, codigo_postal, telefono, lat, lng, zona_id, ventana_desde, ventana_hasta, horario_texto, notas_acceso, minutos_descarga, orden_habitual").order("nombre"),
    sb.from("zonas_reparto").select("id, nombre").eq("activa", true).order("nombre"),
  ]);
  return <ClientesReparto destinos={destinos ?? []} zonas={zonas ?? []} />;
}
