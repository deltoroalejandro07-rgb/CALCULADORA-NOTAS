import type { Metadata } from "next";
import { Suspense } from "react";
import { Cabecera, Cargando } from "@/components/app/piezas";
import { PanelHoy } from "@/components/hoy/panel-hoy";
import { usuarioActual } from "@/lib/auth";
import { supabaseServidor } from "@/lib/supabase/servidor";

export const metadata: Metadata = { title: "Hoy" };

export default function PaginaHoy() {
  return (
    <Suspense fallback={<Cargando />}>
      <Contenido />
    </Suspense>
  );
}

async function Contenido() {
  const usuario = await usuarioActual();
  const supabase = await supabaseServidor();
  // RLS: el comercial recibe los suyos; el admin, los de todo el equipo
  const { data, error } = await supabase
    .from("clientes")
    .select(
      "id, nombre_negocio, tipo, zona, direccion, estado, telefono, lat, lng, ultimo_resultado, ultimo_resultado_at, ultima_visita_at, proxima_accion, proxima_accion_fecha, horario_visita, is_seed",
    )
    .neq("estado", "perdido");
  if (error) throw error;

  const fechaLarga = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", weekday: "long", day: "numeric", month: "long" }).format(new Date());
  return (
    <>
      <Cabecera
        logo
        titulo={`Hola, ${usuario.nombre.split(" ")[0]}`}
        subtitulo={`${fechaLarga.charAt(0).toUpperCase()}${fechaLarga.slice(1)}${usuario.rol === "admin" ? " · todo el equipo" : ""}`}
      />
      <PanelHoy clientes={data} />
    </>
  );
}
