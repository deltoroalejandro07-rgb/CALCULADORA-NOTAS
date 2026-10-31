import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Cabecera, Cargando } from "@/components/app/piezas";
import { Almacen } from "@/components/logistica/almacen";
import { Vehiculos } from "@/components/logistica/vehiculos";
import { exigirAdmin } from "@/lib/auth";
import { supabaseServidor } from "@/lib/supabase/servidor";

export const metadata: Metadata = { title: "Vehículos y almacén" };

export default function PaginaVehiculos() {
  return (
    <>
      <Link href="/logistica" className="inline-flex min-h-11 items-center gap-1 px-3 pt-3 text-sm text-suave">
        <ChevronLeft className="h-5 w-5" aria-hidden /> Reparto
      </Link>
      <Cabecera titulo="Vehículos y almacén" />
      <Suspense fallback={<Cargando />}>
        <Contenido />
      </Suspense>
    </>
  );
}

async function Contenido() {
  await exigirAdmin();
  const sb = await supabaseServidor();
  const [{ data: vehiculos }, { data: perfiles }, { data: ajustes }] = await Promise.all([
    sb.from("vehiculos").select("*").order("activo", { ascending: false }).order("nombre"),
    sb.from("perfiles").select("id, nombre").eq("activo", true).order("nombre"),
    sb.from("ajustes_logistica").select("almacen_direccion, almacen_lat, almacen_lng").single(),
  ]);
  return (
    <div className="space-y-4 px-4 pb-8">
      <Almacen inicial={ajustes ?? { almacen_direccion: null, almacen_lat: null, almacen_lng: null }} />
      <Vehiculos vehiculos={(vehiculos ?? []).map((v) => ({ ...v, capacidad_kg: v.capacidad_kg == null ? null : Number(v.capacidad_kg) }))} conductores={perfiles ?? []} />
    </div>
  );
}
