import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Cabecera, Cargando } from "@/components/app/piezas";
import { AvisosMovil } from "@/components/app/avisos";
import { ClavesAvisos } from "@/components/ajustes/claves-avisos";
import { exigirAdmin } from "@/lib/auth";
import { clavePublicaAvisos } from "@/lib/avisos";
import { supabaseServidor } from "@/lib/supabase/servidor";

export const metadata: Metadata = { title: "Avisos en el móvil" };

export default function PaginaAvisos() {
  return (
    <>
      <Link href="/mas" className="inline-flex min-h-11 items-center gap-1 px-3 pt-3 text-sm text-suave lg:hidden">
        <ChevronLeft className="h-5 w-5" aria-hidden /> Más
      </Link>
      <Cabecera titulo="Avisos en el móvil" subtitulo="Recordatorios para el equipo y la ruta para el conductor" />
      <Suspense fallback={<Cargando />}>
        <Contenido />
      </Suspense>
    </>
  );
}

async function Contenido() {
  await exigirAdmin();
  const sb = await supabaseServidor();
  const { count } = await sb.from("push_suscripciones").select("*", { count: "exact", head: true });
  const estado = {
    claves: !!(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY),
    secreta: !!process.env.SUPABASE_SECRET_KEY,
    cron: !!process.env.CRON_SECRET,
  };
  const listo = estado.claves && estado.secreta && estado.cron;
  return (
    <div className="space-y-4 px-4 pb-8 lg:max-w-3xl">
      <section className="rounded-xl border border-borde bg-superficie p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <h2 className="font-semibold">Qué avisos llegan</h2>
        <ul className="mt-2 space-y-1 text-sm text-suave">
          <li>• <strong className="text-texto">Cada mañana (sobre las 7-8 h):</strong> a cada comercial, sus reuniones, tareas y seguimientos del día; al repartidor, su ruta.</li>
          <li>• <strong className="text-texto">Al aceptar una ruta:</strong> al conductor, «Ya tienes tu ruta».</li>
        </ul>
        <p className="mt-2 text-xs text-suave">Cada persona los activa en su móvil, en «Más». {listo && `Ahora hay ${count ?? 0} ${count === 1 ? "móvil activado" : "móviles activados"}.`}</p>
      </section>

      {listo ? (
        <section className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
          <p className="font-semibold text-emerald-800 dark:text-emerald-200">✓ Los avisos están configurados</p>
          <div className="mt-3 rounded-lg bg-superficie p-3">
            <AvisosMovil clavePublica={clavePublicaAvisos()} />
          </div>
        </section>
      ) : (
        <ClavesAvisos estado={estado} />
      )}
    </div>
  );
}
