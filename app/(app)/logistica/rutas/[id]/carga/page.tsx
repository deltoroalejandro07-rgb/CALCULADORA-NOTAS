import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Cabecera, Cargando, Tarjeta } from "@/components/app/piezas";
import { BotonImprimir, EstiloImpresion } from "@/components/logistica/acciones-ruta";
import { exigirAdmin } from "@/lib/auth";
import { ordenCarga, totalCarga } from "@/lib/dominio/reparto";
import { fecha } from "@/lib/formato";
import { supabaseServidor } from "@/lib/supabase/servidor";

export const metadata: Metadata = { title: "Hoja de carga" };

export default function PaginaCarga({ params }: PageProps<"/logistica/rutas/[id]/carga">) {
  return (
    <Suspense fallback={<Cargando />}>
      {params.then(({ id }) => (
        <Contenido id={id} />
      ))}
    </Suspense>
  );
}

async function Contenido({ id }: { id: string }) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  await exigirAdmin();
  const sb = await supabaseServidor();
  const { data: ruta } = await sb
    .from("rutas")
    .select("id, fecha, vehiculos(nombre, matricula), conductor:perfiles!rutas_conductor_id_fkey(nombre), paradas(orden, estado, clientes(nombre_negocio), destinos(nombre), albaranes(lineas), pedidos(pedido_lineas(producto_id, descripcion, cantidad)))")
    .eq("id", id)
    .maybeSingle();
  if (!ruta) notFound();

  const paradas = ruta.paradas
    .filter((p) => p.estado === "pendiente")
    .map((p) => ({
      orden: p.orden,
      cliente: p.clientes?.nombre_negocio ?? p.destinos?.nombre ?? "—",
      lineas: p.pedidos
        ? p.pedidos.pedido_lineas.map((l) => ({ ...l, cantidad: Number(l.cantidad) }))
        : ((p.albaranes?.lineas as { descripcion: string; cantidad: number }[] | undefined) ?? []).map((l) => ({ producto_id: null, descripcion: l.descripcion, cantidad: Number(l.cantidad) })),
    }));
  const total = totalCarga(paradas);
  const enOrden = [...paradas].sort((a, b) => a.orden - b.orden);
  const numero = new Map(enOrden.map((p, i) => [p.orden, i + 1]));

  return (
    <>
      <EstiloImpresion />
      <Link href={`/logistica/rutas/${id}`} className="no-imprimir inline-flex min-h-11 items-center gap-1 px-3 pt-3 text-sm text-suave">
        <ChevronLeft className="h-5 w-5" aria-hidden /> Ruta
      </Link>
      <Cabecera
        titulo="Hoja de carga"
        subtitulo={`${fecha(ruta.fecha)} · ${ruta.vehiculos?.nombre ?? "Sin vehículo"}${ruta.vehiculos?.matricula ? ` (${ruta.vehiculos.matricula})` : ""} · ${ruta.conductor?.nombre ?? ""}`}
      />
      <div className="space-y-4 px-4 pb-8">
        <Tarjeta>
          <h2 className="mb-2 font-semibold">Total a cargar</h2>
          {total.length ? (
            <table className="w-full text-sm">
              <tbody className="divide-y divide-borde">
                {total.map((l) => (
                  <tr key={l.clave}>
                    <td className="py-2">{l.descripcion}</td>
                    <td className="py-2 text-right font-semibold tabular-nums">{l.cantidad.toLocaleString("es-ES")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-suave">No hay productos pendientes de entregar en esta ruta.</p>
          )}
        </Tarjeta>

        <Tarjeta>
          <h2 className="font-semibold">Orden de carga</h2>
          <p className="mb-2 text-sm text-suave">Lo último que se entrega va al fondo: carga en este orden.</p>
          <ol className="space-y-3">
            {ordenCarga(paradas).map((p) => (
              <li key={p.orden} className="text-sm">
                <p className="font-semibold">
                  Parada {numero.get(p.orden)} · {p.cliente}
                </p>
                <p className="text-suave">{p.lineas.length ? p.lineas.map((l) => `${l.cantidad.toLocaleString("es-ES")} × ${l.descripcion}`).join(", ") : "Sin productos"}</p>
              </li>
            ))}
          </ol>
        </Tarjeta>
        <BotonImprimir />
      </div>
    </>
  );
}
