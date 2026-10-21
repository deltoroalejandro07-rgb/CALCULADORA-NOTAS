import { AlarmClock, CalendarDays, Flame, Snowflake } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Cabecera, Cargando, Proximamente } from "@/components/app/piezas";
import { usuarioActual } from "@/lib/auth";
import { supabaseServidor } from "@/lib/supabase/servidor";

export const metadata: Metadata = { title: "Hoy" };

export default function PaginaHoy() {
  return (
    <Suspense fallback={<Cargando />}>
      <Resumen />
    </Suspense>
  );
}

function hoyMadrid() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date()); // aaaa-mm-dd
}

function haceDias(n: number) {
  return new Date(Date.now() - n * 86_400_000).toISOString();
}

async function Resumen() {
  const usuario = await usuarioActual();
  const supabase = await supabaseServidor();
  const hoy = hoyMadrid();

  // RLS ya limita a los clientes del comercial; el admin ve todos.
  const contar = () => supabase.from("clientes").select("id", { count: "exact", head: true }).neq("estado", "perdido");
  const [vencidos, deHoy, calientes, olvidados] = await Promise.all([
    contar().lt("proxima_accion_fecha", hoy),
    contar().eq("proxima_accion_fecha", hoy),
    contar().in("ultimo_resultado", ["pide_oferta", "interesado"]).gte("ultimo_resultado_at", haceDias(14)),
    contar().or(`ultima_visita_at.is.null,ultima_visita_at.lt.${haceDias(30)}`),
  ]);

  const fechaLarga = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", weekday: "long", day: "numeric", month: "long" }).format(new Date());
  const tarjetas = [
    { texto: "Seguimientos vencidos", n: vencidos.count, icono: AlarmClock, clase: "text-red-600 dark:text-red-400" },
    { texto: "Seguimientos de hoy", n: deHoy.count, icono: CalendarDays, clase: "text-marca" },
    { texto: "Oportunidades calientes", n: calientes.count, icono: Flame, clase: "text-orange-600 dark:text-orange-400" },
    { texto: "Sin visitar +30 días", n: olvidados.count, icono: Snowflake, clase: "text-sky-600 dark:text-sky-400" },
  ];

  return (
    <>
      <Cabecera titulo={`Hola, ${usuario.nombre.split(" ")[0]}`} subtitulo={fechaLarga.charAt(0).toUpperCase() + fechaLarga.slice(1)} />
      <section className="grid grid-cols-2 gap-3 px-4">
        {tarjetas.map(({ texto, n, icono: Icono, clase }) => (
          <Link key={texto} href="/clientes" className="rounded-2xl border border-borde bg-superficie p-4 active:scale-[0.98]">
            <Icono className={`h-6 w-6 ${clase}`} aria-hidden />
            <p className="mt-2 text-3xl font-bold tabular-nums">{n ?? 0}</p>
            <p className="text-sm leading-tight text-suave">{texto}</p>
          </Link>
        ))}
      </section>
      <div className="mt-4">
        <Proximamente paso={3}>Aquí irán las listas de seguimientos y oportunidades y el mapa con la ruta del día.</Proximamente>
      </div>
    </>
  );
}
