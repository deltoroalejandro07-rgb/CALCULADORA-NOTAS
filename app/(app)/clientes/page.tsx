import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { Cabecera, Cargando, Demo, EtiquetaEstado, IconoTemperatura, Proximamente } from "@/components/app/piezas";
import { usuarioActual } from "@/lib/auth";
import { calcularTemperatura } from "@/lib/dominio/temperatura";
import { TEXTO_TIPO_NEGOCIO } from "@/lib/dominio/tipos";
import { fecha } from "@/lib/formato";
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
  const { data: clientes, error } = await supabase
    .from("clientes")
    .select("id, nombre_negocio, tipo, zona, estado, ultimo_resultado, ultimo_resultado_at, ultima_visita_at, is_seed, comercial:perfiles!clientes_comercial_id_fkey(nombre)")
    .order("nombre_negocio");

  if (error) throw error;

  return (
    <>
      <Cabecera
        titulo="Clientes"
        subtitulo={`${clientes.length} ${usuario.rol === "admin" ? "en total" : "asignados a ti"}`}
      />
      <div className="mb-3">
        <Proximamente paso={2}>Búsqueda, filtros, mapa y ficha completa de cada cliente.</Proximamente>
      </div>
      <ul className="divide-y divide-borde border-y border-borde bg-superficie">
        {clientes.map((c) => (
          <li key={c.id} className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 truncate font-semibold">
                <span className="truncate">{c.nombre_negocio}</span>
                {c.is_seed && <Demo />}
              </p>
              <p className="truncate text-sm text-suave">
                {TEXTO_TIPO_NEGOCIO[c.tipo]} · {c.zona ?? "Sin zona"} · Última visita {fecha(c.ultima_visita_at)}
                {usuario.rol === "admin" && c.comercial ? ` · ${c.comercial.nombre}` : ""}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <EtiquetaEstado estado={c.estado} />
              <IconoTemperatura t={calcularTemperatura(c)} />
            </div>
            <ChevronRight className="h-5 w-5 text-suave" aria-hidden />
          </li>
        ))}
      </ul>
    </>
  );
}
