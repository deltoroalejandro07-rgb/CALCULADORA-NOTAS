import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Cargando } from "@/components/app/piezas";
import { BotonImprimir, EstiloImpresion } from "@/components/logistica/acciones-ruta";
import { usuarioActual } from "@/lib/auth";
import { TEXTO_ESTADO_PARADA, type LineaEntrega } from "@/lib/dominio/reparto";
import { euros, fecha, fechaHora } from "@/lib/formato";
import { supabaseServidor } from "@/lib/supabase/servidor";

export const metadata: Metadata = { title: "Albarán de entrega" };

// Lo pueden abrir la oficina, el conductor de la ruta y el comercial del cliente (lo filtra RLS)
export default function PaginaAlbaran({ params }: PageProps<"/logistica/albaran/[id]">) {
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
  const usuario = await usuarioActual();
  const sb = await supabaseServidor();
  const { data: p } = await sb
    .from("paradas")
    .select(
      "id, estado, entrega_id, realizada_at, registrada_at, firmante, firma_path, fotos, lineas, envases_entregados, envases_recogidos, cobrado, forma_cobro, motivo_fallo, observaciones, lat, lng, precision_m, ruta_id, clientes(id, nombre_negocio, direccion, localidad, codigo_postal, telefono), destinos(nombre, direccion, localidad, codigo_postal), albaranes(numero), pedidos(fecha), conductor:perfiles!paradas_registrada_por_fkey(nombre), rutas(fecha, vehiculos(nombre, matricula))",
    )
    .eq("id", id)
    .maybeSingle();
  if (!p || p.estado === "pendiente") notFound();

  const firmados = await sb.storage.from("entregas").createSignedUrls([p.firma_path, ...p.fotos].filter((x): x is string => !!x), 3600);
  const url = (path: string | null) => firmados.data?.find((f) => f.path === path)?.signedUrl ?? null;
  const lineas = (p.lineas ?? []) as unknown as LineaEntrega[];
  const volver = usuario.rol === "admin" || !p.clientes ? `/logistica/rutas/${p.ruta_id}` : `/clientes/${p.clientes.id}`;
  const cliente = p.clientes
    ? { nombre: p.clientes.nombre_negocio, direccion: p.clientes.direccion, codigo_postal: p.clientes.codigo_postal, localidad: p.clientes.localidad }
    : { nombre: p.destinos?.nombre ?? "—", direccion: p.destinos?.direccion ?? null, codigo_postal: p.destinos?.codigo_postal ?? null, localidad: p.destinos?.localidad ?? null };

  return (
    <>
      <EstiloImpresion />
      <Link href={volver} className="no-imprimir inline-flex min-h-11 items-center gap-1 px-3 pt-3 text-sm text-suave">
        <ChevronLeft className="h-5 w-5" aria-hidden /> Volver
      </Link>
      <article className="mx-4 my-4 space-y-4 rounded-xl border border-borde bg-superficie p-5 text-sm print:border-0 print:p-0">
        <header className="flex items-start justify-between gap-3 border-b border-borde pb-3">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="dliverygo" width={318} height={103} className="h-8 w-auto" />
            <h1 className="mt-2 text-lg font-bold">Albarán de entrega</h1>
          </div>
          <div className="text-right text-xs text-suave">
            <p>Ref. {p.entrega_id?.slice(0, 8).toUpperCase()}</p>
            {p.rutas?.fecha && <p>Ruta del {fecha(p.rutas.fecha)}</p>}
            {p.rutas?.vehiculos && (
              <p>
                {p.rutas.vehiculos.nombre}
                {p.rutas.vehiculos.matricula && ` · ${p.rutas.vehiculos.matricula}`}
              </p>
            )}
          </div>
        </header>

        <section>
          <p className="text-xs font-semibold text-suave">Cliente</p>
          <p className="font-semibold">{cliente.nombre}</p>
          <p className="text-suave">{[cliente.direccion, cliente.codigo_postal, cliente.localidad].filter(Boolean).join(", ")}</p>
        </section>

        <section className={p.estado === "fallida" ? "rounded-lg bg-red-50 p-3 dark:bg-red-950/40" : ""}>
          <p className="font-semibold">
            {TEXTO_ESTADO_PARADA[p.estado]} · {p.realizada_at && fechaHora(p.realizada_at)}
          </p>
          {p.estado === "fallida" && <p>Motivo: {p.motivo_fallo}</p>}
          {p.conductor?.nombre && <p className="text-suave">Repartidor: {p.conductor.nombre}</p>}
          {p.pedidos?.fecha && <p className="text-suave">Pedido del {fecha(p.pedidos.fecha)}</p>}
          {p.albaranes?.numero && <p className="text-suave">Albarán de Holded {p.albaranes.numero}</p>}
        </section>

        {lineas.length > 0 && (
          <table className="w-full">
            <thead>
              <tr className="border-b border-borde text-left text-xs uppercase tracking-wide text-suave">
                <th className="py-1 font-semibold">Producto</th>
                <th className="py-1 pl-3 text-right font-semibold">Pedido</th>
                <th className="py-1 pl-3 text-right font-semibold">Entregado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borde">
              {lineas.map((l, i) => (
                <tr key={i} className={l.entregada < l.pedida ? "text-amber-700 dark:text-amber-300" : ""}>
                  <td className="py-1.5">{l.descripcion}</td>
                  <td className="py-1.5 pl-3 text-right tabular-nums">{l.pedida.toLocaleString("es-ES")}</td>
                  <td className="py-1.5 pl-3 text-right font-semibold tabular-nums">{l.entregada.toLocaleString("es-ES")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {(p.envases_entregados > 0 || p.envases_recogidos > 0 || (p.cobrado != null && Number(p.cobrado) > 0)) && (
          <section className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-fondo p-2">
              <p className="text-lg font-bold tabular-nums">{p.envases_entregados}</p>
              <p className="text-xs text-suave">Envases entregados</p>
            </div>
            <div className="rounded-lg bg-fondo p-2">
              <p className="text-lg font-bold tabular-nums">{p.envases_recogidos}</p>
              <p className="text-xs text-suave">Envases recogidos</p>
            </div>
            <div className="rounded-lg bg-fondo p-2">
              <p className="text-lg font-bold tabular-nums">{p.cobrado != null ? euros(p.cobrado) : "—"}</p>
              <p className="text-xs text-suave">Cobrado{p.forma_cobro && ` (${p.forma_cobro})`}</p>
            </div>
          </section>
        )}

        {p.observaciones && <p>Observaciones: {p.observaciones}</p>}

        {p.firma_path && (
          <section>
            <p className="text-xs font-semibold text-suave">Firma del cliente{p.firmante && `: ${p.firmante}`}</p>
            {url(p.firma_path) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={url(p.firma_path)!} alt={`Firma de ${p.firmante ?? "el cliente"}`} className="mt-1 h-32 w-full rounded-lg border border-borde bg-white object-contain" />
            ) : (
              <p className="text-suave">La firma se está subiendo desde el móvil del repartidor.</p>
            )}
          </section>
        )}

        {p.fotos.length > 0 && (
          <section>
            <p className="text-xs font-semibold text-suave">Fotos de la entrega</p>
            <div className="mt-1 grid grid-cols-2 gap-2">
              {p.fotos.map((f) =>
                url(f) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={f} src={url(f)!} alt="Foto de la entrega" className="aspect-square w-full rounded-lg object-cover" />
                ) : null,
              )}
            </div>
          </section>
        )}

        <footer className="border-t border-borde pt-3 text-xs text-suave">
          {p.lat != null && p.lng != null && (
            <p>
              Ubicación al entregar: {p.lat.toFixed(5)}, {p.lng.toFixed(5)}
              {p.precision_m != null && ` (±${Math.round(p.precision_m)} m)`}
            </p>
          )}
          {p.registrada_at && <p>Recibido en el sistema: {fechaHora(p.registrada_at)}</p>}
        </footer>
      </article>
      <div className="mx-4 mb-8">
        <BotonImprimir />
      </div>
    </>
  );
}
