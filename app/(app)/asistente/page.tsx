import type { Metadata } from "next";
import { Suspense } from "react";
import { Cabecera, Cargando } from "@/components/app/piezas";
import { Asistente } from "@/components/ia/asistente";
import { exigirAdmin } from "@/lib/auth";
import { iaDisponible } from "@/lib/ia/ia";

export const metadata: Metadata = { title: "Pregúntale a tu CRM" };

// La IA consulta varias veces los datos antes de responder
export const maxDuration = 120;

export default function PaginaAsistente() {
  return (
    <>
      <Cabecera titulo="Pregúntale a tu CRM" subtitulo="Pregunta lo que quieras sobre clientes, visitas y reparto" />
      <Suspense fallback={<Cargando />}>
        <Contenido />
      </Suspense>
    </>
  );
}

async function Contenido() {
  await exigirAdmin();
  return <Asistente activa={iaDisponible()} />;
}
