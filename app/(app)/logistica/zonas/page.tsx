import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Cabecera, Cargando } from "@/components/app/piezas";
import { AjustesPlan, Zonas } from "@/components/logistica/zonas";
import { exigirAdmin } from "@/lib/auth";
import { supabaseServidor } from "@/lib/supabase/servidor";

export const metadata: Metadata = { title: "Zonas y días de reparto" };

export default function PaginaZonas() {
  return (
    <>
      <Link href="/logistica" className="inline-flex min-h-11 items-center gap-1 px-3 pt-3 text-sm text-suave">
        <ChevronLeft className="h-5 w-5" aria-hidden /> Logística
      </Link>
      <Cabecera titulo="Zonas y días" subtitulo="Qué zona se reparte cada día de la semana" />
      <Suspense fallback={<Cargando />}>
        <Contenido />
      </Suspense>
    </>
  );
}

async function Contenido() {
  await exigirAdmin();
  const sb = await supabaseServidor();
  const [{ data: zonas }, { data: vehiculos }, { data: ajustes }, { data: destinos }] = await Promise.all([
    sb.from("zonas_reparto").select("id, nombre, dias, vehiculo_id, color").eq("activa", true).order("nombre"),
    sb.from("vehiculos").select("id, nombre").eq("activo", true).order("nombre"),
    sb.from("ajustes_logistica").select("minutos_descarga, hora_salida, volver_almacen").single(),
    sb.from("destinos").select("zona_id"),
  ]);
  const porZona = new Map<string, number>();
  destinos?.forEach((d) => d.zona_id && porZona.set(d.zona_id, (porZona.get(d.zona_id) ?? 0) + 1));
  return (
    <div className="space-y-4 px-4 pb-8">
      <Zonas zonas={(zonas ?? []).map((z) => ({ ...z, clientes: porZona.get(z.id) ?? 0 }))} vehiculos={vehiculos ?? []} />
      <AjustesPlan inicial={ajustes ?? { minutos_descarga: 10, hora_salida: "08:00", volver_almacen: true }} />
    </div>
  );
}
