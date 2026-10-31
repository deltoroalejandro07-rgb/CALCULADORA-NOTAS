import { ChevronLeft, ClipboardList, FileDown } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Cabecera, Cargando, Tarjeta } from "@/components/app/piezas";
import { BorrarRuta } from "@/components/logistica/acciones-ruta";
import { AnadirParadas } from "@/components/logistica/anadir-paradas";
import { ListaParadas, type ParadaOficina } from "@/components/logistica/lista-paradas";
import { exigirAdmin } from "@/lib/auth";
import { textoFranja } from "@/lib/dominio/horario";
import { TEXTO_ESTADO_RUTA } from "@/lib/dominio/reparto";
import { fecha, fechaHora } from "@/lib/formato";
import { supabaseServidor } from "@/lib/supabase/servidor";

export const metadata: Metadata = { title: "Ruta de reparto" };

export default function PaginaRuta({ params }: PageProps<"/logistica/rutas/[id]">) {
  return (
    <>
      <Link href="/logistica" className="inline-flex min-h-11 items-center gap-1 px-3 pt-3 text-sm text-suave">
        <ChevronLeft className="h-5 w-5" aria-hidden /> Reparto
      </Link>
      <Suspense fallback={<Cargando />}>
        {params.then(({ id }) => (
          <Contenido id={id} />
        ))}
      </Suspense>
    </>
  );
}

async function Contenido({ id }: { id: string }) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  await exigirAdmin();
  const sb = await supabaseServidor();
  const [{ data: ruta }, { data: porRepartir }, { data: clientes }] = await Promise.all([
    sb
      .from("rutas")
      .select(
        "id, fecha, estado, notas, iniciada_at, terminada_at, vehiculos(nombre, matricula), conductor:perfiles!rutas_conductor_id_fkey(nombre), paradas(id, orden, estado, notas_oficina, realizada_at, firmante, motivo_fallo, envases_recogidos, cobrado, pedido_id, llegada_prevista, destinos(id, nombre, direccion, localidad, telefono, lat, lng, horario_texto, ventana_desde, ventana_hasta, notas_acceso), albaranes(numero, lineas), clientes(id, nombre_negocio, direccion, localidad, telefono, lat, lng, estado, clientes_entrega(horario_entrega, notas_acceso)), pedidos(fecha, importe_total, pedido_lineas(descripcion, cantidad)))",
      )
      .eq("id", id)
      .maybeSingle(),
    sb.from("albaranes").select("id, numero, fecha, destinos(nombre, localidad, zonas_reparto(nombre))").eq("estado", "pendiente").order("creado_at"),
    sb.from("clientes").select("id, nombre_negocio, zona").order("nombre_negocio"),
  ]);
  if (!ruta) notFound();

  const paradas: ParadaOficina[] = [...ruta.paradas]
    .sort((a, b) => a.orden - b.orden)
    .map((p) => ({
      id: p.id,
      orden: p.orden,
      estado: p.estado,
      notas_oficina: p.notas_oficina,
      realizada_at: p.realizada_at,
      firmante: p.firmante,
      motivo_fallo: p.motivo_fallo,
      envases_recogidos: p.envases_recogidos,
      cobrado: p.cobrado == null ? null : Number(p.cobrado),
      cliente: p.clientes
        ? {
            tipo: "cliente" as const,
            id: p.clientes.id,
            nombre: p.clientes.nombre_negocio,
            direccion: [p.clientes.direccion, p.clientes.localidad].filter(Boolean).join(", "),
            sinUbicacion: p.clientes.lat == null || p.clientes.lng == null,
            horario_entrega: p.clientes.clientes_entrega?.horario_entrega ?? null,
            notas_acceso: p.clientes.clientes_entrega?.notas_acceso ?? null,
            telefono: p.clientes.telefono,
          }
        : {
            tipo: "destino" as const,
            id: p.destinos!.id,
            nombre: p.destinos!.nombre,
            direccion: [p.destinos!.direccion, p.destinos!.localidad].filter(Boolean).join(", "),
            sinUbicacion: p.destinos!.lat == null || p.destinos!.lng == null,
            horario_entrega: p.destinos!.horario_texto ?? textoFranja(p.destinos!.ventana_desde, p.destinos!.ventana_hasta),
            notas_acceso: p.destinos!.notas_acceso,
            telefono: p.destinos!.telefono,
          },
      llegada_prevista: p.llegada_prevista?.slice(0, 5) ?? null,
      albaran: p.albaranes?.numero ?? null,
      pedido: p.pedidos
        ? { fecha: p.pedidos.fecha, importe: Number(p.pedidos.importe_total), lineas: p.pedidos.pedido_lineas.map((l) => `${Number(l.cantidad)} × ${l.descripcion}`) }
        : p.albaranes
          ? { fecha: null, importe: null, lineas: ((p.albaranes.lineas as { descripcion: string; cantidad: number }[]) ?? []).map((l) => `${Number(l.cantidad)} × ${l.descripcion}`) }
          : null,
    }));
  const hechas = paradas.filter((p) => p.estado !== "pendiente").length;
  const editable = ruta.estado !== "terminada";
  const reordenable = hechas === 0;
  return (
    <>
      <Cabecera
        titulo={ruta.vehiculos?.nombre ?? "Ruta sin vehículo"}
        subtitulo={`${fecha(ruta.fecha)} · ${ruta.conductor?.nombre ?? "Sin conductor"} · ${TEXTO_ESTADO_RUTA[ruta.estado]}`}
      />
      <div className="space-y-4 px-4 pb-8">
        <Tarjeta className="text-sm">
          <p>
            <span className="font-semibold">{hechas}</span> de <span className="font-semibold">{paradas.length}</span> paradas hechas
            {ruta.iniciada_at && <span className="text-suave"> · empezó {fechaHora(ruta.iniciada_at)}</span>}
            {ruta.terminada_at && <span className="text-suave"> · terminó {fechaHora(ruta.terminada_at)}</span>}
          </p>
          {ruta.notas && <p className="mt-1 text-suave">Notas: {ruta.notas}</p>}
          <a href={`/api/logistica/rutas/${ruta.id}/pdf`} target="_blank" rel="noreferrer" className="mt-3 flex min-h-12 items-center justify-center gap-2 rounded-lg bg-marca font-semibold text-marca-texto active:opacity-90">
            <FileDown className="h-5 w-5" aria-hidden /> Descargar PDF de la ruta
          </a>
          <Link href={`/logistica/rutas/${ruta.id}/carga`} className="mt-2 flex min-h-11 items-center justify-center gap-2 rounded-lg border border-borde font-semibold active:bg-fondo">
            <ClipboardList className="h-5 w-5" aria-hidden /> Hoja de carga en pantalla
          </Link>
        </Tarjeta>

        
        <ListaParadas rutaId={ruta.id} paradas={paradas} editable={editable} reordenable={reordenable} />

        {editable && (
          <AnadirParadas
            rutaId={ruta.id}
            albaranes={(porRepartir ?? []).map((a) => ({ id: a.id, numero: a.numero, fecha: a.fecha, cliente: a.destinos?.nombre ?? "—", zona: a.destinos?.zonas_reparto?.nombre ?? a.destinos?.localidad ?? null }))}
            clientes={clientes ?? []}
          />
        )}

        {hechas === 0 && <BorrarRuta id={ruta.id} />}
      </div>
    </>
  );
}
