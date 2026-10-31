import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Cabecera, Cargando } from "@/components/app/piezas";
import { GestionUsuarios } from "@/components/ajustes/gestion-usuarios";
import { exigirAdmin } from "@/lib/auth";
import { supabaseServidor } from "@/lib/supabase/servidor";

export const metadata: Metadata = { title: "Usuarios" };

export default function PaginaUsuarios() {
  return (
    <>
      <Link href="/mas" className="inline-flex min-h-11 items-center gap-1 px-3 pt-3 text-sm text-suave lg:hidden">
        <ChevronLeft className="h-5 w-5" aria-hidden /> Más
      </Link>
      <Cabecera titulo="Usuarios" subtitulo="Comerciales y administradores" />
      <Suspense fallback={<Cargando />}>
        <Contenido />
      </Suspense>
    </>
  );
}

async function Contenido() {
  const yo = await exigirAdmin();
  const sb = await supabaseServidor();
  const [{ data: perfiles }, { data: clientes }] = await Promise.all([
    sb.from("perfiles").select("id, nombre, email, telefono, rol, activo, creado_at").order("activo", { ascending: false }).order("nombre"),
    sb.from("clientes").select("comercial_id"),
  ]);
  const porComercial = new Map<string, number>();
  clientes?.forEach((c) => c.comercial_id && porComercial.set(c.comercial_id, (porComercial.get(c.comercial_id) ?? 0) + 1));
  return (
    <GestionUsuarios
      yo={yo.id}
      usuarios={(perfiles ?? []).map((p) => ({ ...p, clientes: porComercial.get(p.id) ?? 0 }))}
      claveConfigurada={!!process.env.SUPABASE_SECRET_KEY}
      urlApp={process.env.NEXT_PUBLIC_SITE_URL ?? null}
    />
  );
}
