import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Cabecera, Cargando } from "@/components/app/piezas";
import { HistorialReparto, type DiaReparto, type RutaDelDia } from "@/components/reparto/historial";
import { usuarioActual } from "@/lib/auth";
import { fechaDentroDe } from "@/lib/dominio/visita";
import { supabaseServidor } from "@/lib/supabase/servidor";

export const metadata: Metadata = { title: "Rutas por días" };

export default function PaginaDiasReparto({ searchParams }: PageProps<"/reparto/dias">) {
  return (
    <>
      <Link href="/reparto" className="inline-flex min-h-11 items-center gap-1 px-3 pt-3 text-sm text-suave">
        <ChevronLeft className="h-5 w-5" aria-hidden /> Mi reparto
      </Link>
      <Cabecera titulo="Rutas por días" subtitulo="Elige un día para ver cómo fue el reparto" />
      <Suspense fallback={<Cargando />}>
        {searchParams.then((sp) => (
          <Contenido fecha={typeof sp.fecha === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.fecha) ? sp.fecha : null} />
        ))}
      </Suspense>
    </>
  );
}

async function Contenido({ fecha }: { fecha: string | null }) {
  const usuario = await usuarioActual();
  const sb = await supabaseServidor();
  const { data: dias } = await sb.rpc("mis_dias_reparto");
  const listaDias = (dias ?? []) as unknown as DiaReparto[];
  const hoy = fechaDentroDe(0);
  // Sin día elegido: el último día con rutas hasta hoy (o hoy)
  const elegido = fecha ?? listaDias.find((d) => d.fecha <= hoy)?.fecha ?? hoy;
  const { data: rutas } = await sb.rpc("reparto_del_dia", { p_fecha: elegido });
  return <HistorialReparto fecha={elegido} dias={listaDias} rutas={(rutas ?? []) as unknown as RutaDelDia[]} esAdmin={usuario.rol === "admin"} />;
}
