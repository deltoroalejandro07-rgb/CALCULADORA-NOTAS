import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Cabecera, Cargando } from "@/components/app/piezas";
import { ListaClientes } from "@/components/clientes/lista-clientes";
import { usuarioActual } from "@/lib/auth";
import { supabaseServidor } from "@/lib/supabase/servidor";

export const metadata: Metadata = { title: "Clientes" };

export default function PaginaClientes() {
  return (
    <Suspense fallback={<Cargando />}>
      <Lista />
    </Suspense>
  );
}

async function Lista() {
  const usuario = await usuarioActual();
  const supabase = await supabaseServidor();
  // RLS: el comercial solo recibe los suyos
  const { data, error } = await supabase
    .from("clientes")
    .select(
      "id, nombre_negocio, tipo, zona, contacto_nombre, direccion, estado, ultimo_resultado, ultimo_resultado_at, ultima_visita_at, proxima_accion, proxima_accion_fecha, lat, lng, is_seed, comercial:perfiles!clientes_comercial_id_fkey(nombre)",
    )
    .order("nombre_negocio");
  if (error) throw error;

  const clientes = data.map(({ comercial, ...c }) => ({ ...c, comercial: comercial?.nombre ?? null }));
  const esAdmin = usuario.rol === "admin";

  return (
    <>
      <Cabecera titulo="Clientes" subtitulo={esAdmin ? "Todos los clientes" : "Asignados a ti"}>
        <Link href="/clientes/nuevo" className="flex min-h-11 items-center gap-1 rounded-lg bg-marca px-4 text-sm font-semibold text-marca-texto shadow-sm hover:brightness-110 lg:min-h-10">
          <Plus className="h-5 w-5" aria-hidden /> Nuevo
        </Link>
      </Cabecera>
      <ListaClientes clientes={clientes} esAdmin={esAdmin} />
    </>
  );
}
