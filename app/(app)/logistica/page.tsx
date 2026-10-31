import { CalendarClock, ChevronLeft, ChevronRight, MessageCircle, Phone, FileDown, FileText, MapPinned, Sparkles, Truck, Warehouse } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Cabecera, Cargando, Tarjeta } from "@/components/app/piezas";
import { NuevaRuta } from "@/components/logistica/nueva-ruta";
import { exigirAdmin } from "@/lib/auth";
import { enlaceLlamada, enlaceWhatsApp } from "@/lib/dominio/contacto";
import { preverPedidos } from "@/lib/dominio/prevision";
import { TEXTO_ESTADO_RUTA, type EstadoRuta } from "@/lib/dominio/reparto";
import { fechaDentroDe } from "@/lib/dominio/visita";
import { fecha as formatoFecha } from "@/lib/formato";
import { supabaseServidor } from "@/lib/supabase/servidor";

export const metadata: Metadata = { title: "Logística" };

const COLOR_RUTA: Record<EstadoRuta, string> = {
  planificada: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  en_curso: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200",
  terminada: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200",
};

export default function PaginaLogistica({ searchParams }: PageProps<"/logistica">) {
  return (
    <>
      <Link href="/mas" className="inline-flex min-h-11 items-center gap-1 px-3 pt-3 text-sm text-suave lg:hidden">
        <ChevronLeft className="h-5 w-5" aria-hidden /> Más
      </Link>
      <Cabecera titulo="Logística" subtitulo="Rutas de reparto y vehículos" />
      <Suspense fallback={<Cargando />}>
        {searchParams.then((sp) => (
          <Contenido dia={typeof sp.fecha === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.fecha) ? sp.fecha : null} />
        ))}
      </Suspense>
    </>
  );
}

const sumarDias = (d: string, n: number) => new Date(Date.parse(d + "T12:00:00Z") + n * 86_400_000).toISOString().slice(0, 10);

async function Contenido({ dia }: { dia: string | null }) {
  await exigirAdmin();
  const hoy = fechaDentroDe(0);
  const fecha = dia ?? hoy;
  const sb = await supabaseServidor();
  const [{ data: rutas }, { data: vehiculos }, { data: perfiles }, { data: almacen }, { count: albaranesPendientes }] = await Promise.all([
    sb
      .from("rutas")
      .select("id, fecha, estado, notas, vehiculos(nombre, matricula), conductor:perfiles!rutas_conductor_id_fkey(nombre), paradas(estado)")
      .eq("fecha", fecha)
      .order("creado_at"),
    sb.from("vehiculos").select("id, nombre, matricula, conductor_habitual").eq("activo", true).order("nombre"),
    sb.from("perfiles").select("id, nombre").eq("activo", true).order("nombre"),
    sb.from("ajustes_logistica").select("almacen_lat").single(),
    sb.from("albaranes").select("*", { count: "exact", head: true }).eq("estado", "pendiente"),
  ]);

  return (
    <div className="space-y-4 px-4 pb-8">
      <div className="flex items-center justify-between rounded-xl border border-borde bg-superficie p-2">
        <Link href={`/logistica?fecha=${sumarDias(fecha, -1)}`} aria-label="Día anterior" className="rounded-lg p-3 active:bg-fondo">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="text-center">
          <p className="font-semibold">{fecha === hoy ? "Hoy" : fecha === sumarDias(hoy, 1) ? "Mañana" : formatoFecha(fecha)}</p>
          {fecha !== hoy && (
            <Link href="/logistica" className="text-xs text-marca underline">
              Volver a hoy
            </Link>
          )}
        </div>
        <Link href={`/logistica?fecha=${sumarDias(fecha, 1)}`} aria-label="Día siguiente" className="rounded-lg p-3 active:bg-fondo">
          <ChevronRight className="h-5 w-5" />
        </Link>
      </div>

      {(!vehiculos?.length || almacen?.almacen_lat == null) && (
        <Tarjeta className="border-amber-300 bg-amber-50 text-sm dark:border-amber-800 dark:bg-amber-950/40">
          <p className="font-semibold">Antes de la primera ruta</p>
          <p className="mt-1 text-suave">
            {!vehiculos?.length ? "Da de alta tus vehículos" : ""}
            {!vehiculos?.length && almacen?.almacen_lat == null ? " y " : ""}
            {almacen?.almacen_lat == null ? "marca dónde está el almacén (punto de salida)" : ""}.
          </p>
          <Link href="/logistica/vehiculos" className="mt-2 inline-block font-medium text-marca underline">
            Ir a vehículos y almacén
          </Link>
        </Tarjeta>
      )}

      <Link
        href={`/logistica/planificar?fecha=${fecha}`}
        className="flex min-h-16 items-center gap-3 rounded-xl bg-marca px-4 py-3 text-marca-texto shadow-sm active:scale-[0.99]"
      >
        <Sparkles className="h-7 w-7 shrink-0" aria-hidden />
        <span className="flex-1">
          <span className="block text-lg font-bold">Calcular ruta automática</span>
          <span className="block text-sm opacity-90">
            {albaranesPendientes ? `${albaranesPendientes} ${albaranesPendientes === 1 ? "albarán" : "albaranes"} por repartir` : "Sube los albaranes y la app hace la ruta"}
          </span>
        </span>
        <ChevronRight className="h-6 w-6" aria-hidden />
      </Link>

      <Suspense fallback={null}>
        <PrevisionPedidos />
      </Suspense>

      <section className="space-y-2">
        <h2 className="text-[13px] font-semibold text-suave">Rutas del día</h2>
        {rutas?.length ? (
          <ul className="space-y-2">
            {rutas.map((r) => {
              const hechas = r.paradas.filter((p) => p.estado !== "pendiente").length;
              return (
                <li key={r.id} className="overflow-hidden rounded-xl border border-borde bg-superficie">
                  <Link href={`/logistica/rutas/${r.id}`} className="flex items-center gap-3 p-4 active:bg-fondo">
                    <Truck className="h-6 w-6 shrink-0 text-marca" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">
                        {r.vehiculos?.nombre ?? "Sin vehículo"}
                        {r.vehiculos?.matricula && <span className="font-normal text-suave"> · {r.vehiculos.matricula}</span>}
                      </p>
                      <p className="text-sm text-suave">
                        {r.conductor?.nombre ?? "Sin conductor"} · {hechas}/{r.paradas.length} paradas
                      </p>
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${COLOR_RUTA[r.estado]}`}>{TEXTO_ESTADO_RUTA[r.estado]}</span>
                  </Link>
                  <a href={`/api/logistica/rutas/${r.id}/pdf`} target="_blank" rel="noreferrer" className="flex min-h-11 items-center justify-center gap-2 border-t border-borde text-sm font-semibold text-marca active:bg-fondo">
                    <FileDown className="h-4 w-4" aria-hidden /> Descargar PDF (carga y orden de reparto)
                  </a>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed border-borde p-4 text-center text-sm text-suave">No hay rutas este día.</p>
        )}
      </section>

      <NuevaRuta fecha={fecha} vehiculos={vehiculos ?? []} conductores={perfiles ?? []} />

      <ul className="divide-y divide-borde overflow-hidden rounded-xl border border-borde bg-superficie">
        <li>
          <Link href="/logistica/albaranes" className="flex min-h-14 items-center gap-3 px-4 active:bg-fondo">
            <FileText className="h-5 w-5 text-marca" aria-hidden />
            <span className="flex-1">Albaranes (subir PDF de Holded)</span>
            <span className="rounded-full bg-marca-suave px-2.5 py-0.5 text-sm font-semibold tabular-nums">{albaranesPendientes ?? 0}</span>
          </Link>
        </li>
        <li>
          <Link href="/logistica/zonas" className="flex min-h-14 items-center gap-3 px-4 active:bg-fondo">
            <MapPinned className="h-5 w-5 text-marca" aria-hidden />
            <span className="flex-1">Zonas y días de reparto</span>
            <ChevronRight className="h-5 w-5 text-suave" aria-hidden />
          </Link>
        </li>
        <li>
          <Link href="/logistica/vehiculos" className="flex min-h-14 items-center gap-3 px-4 active:bg-fondo">
            <Warehouse className="h-5 w-5 text-marca" aria-hidden />
            <span className="flex-1">Vehículos y almacén</span>
            <ChevronRight className="h-5 w-5 text-suave" aria-hidden />
          </Link>
        </li>
      </ul>
    </div>
  );
}

/** Clientes de Holded a los que, por su ritmo de pedidos, ya les toca pedir. */
async function PrevisionPedidos() {
  const hoy = fechaDentroDe(0);
  const sb = await supabaseServidor();
  const desde = sumarDias(hoy, -180);
  const [{ data: albs }, { data: destinos }] = await Promise.all([
    sb.from("albaranes").select("destino_id, fecha, creado_at").neq("estado", "anulado").gte("creado_at", desde),
    sb.from("destinos").select("id, nombre, telefono, localidad"),
  ]);
  const prev = preverPedidos((albs ?? []).map((a) => ({ destinoId: a.destino_id, fecha: a.fecha ?? a.creado_at.slice(0, 10) })), hoy);
  if (!prev.length) return null;
  const porId = new Map((destinos ?? []).map((d) => [d.id, d]));
  return (
    <section className="space-y-2">
      <h2 className="flex items-center gap-1.5 text-[13px] font-semibold text-suave">
        <CalendarClock className="h-4 w-4 text-marca" aria-hidden /> Previsión de pedidos
      </h2>
      <ul className="divide-y divide-borde overflow-hidden rounded-xl border border-borde bg-superficie text-sm shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        {prev.slice(0, 10).map((p) => {
          const d = porId.get(p.destinoId);
          if (!d) return null;
          return (
            <li key={p.destinoId} className="flex items-center gap-3 px-3 py-2.5">
              <span className={p.estado === "toca" ? "h-2 w-2 shrink-0 rounded-full bg-acento" : "h-2 w-2 shrink-0 rounded-full bg-amber-400"} aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{d.nombre}</span>
                <span className="block truncate text-xs text-suave">
                  {p.estado === "toca" ? `Le toca pedir: suele pedir cada ${p.cadaDias} días y hace ${p.diasDesdeUltimo}` : `Pedirá pronto: cada ${p.cadaDias} días, último hace ${p.diasDesdeUltimo}`}
                </span>
              </span>
              {d.telefono && (
                <>
                  <a href={enlaceWhatsApp(d.telefono, "Hola, somos dliverygo. ¿Te preparamos tu pedido? Si nos lo pasas hoy, te lo llevamos en el próximo reparto.")} target="_blank" rel="noreferrer" aria-label={`WhatsApp a ${d.nombre}`} className="rounded-md p-2 text-emerald-700 hover:bg-fondo dark:text-emerald-300">
                    <MessageCircle className="h-4 w-4" />
                  </a>
                  <a href={enlaceLlamada(d.telefono)} aria-label={`Llamar a ${d.nombre}`} className="rounded-md p-2 text-suave hover:bg-fondo">
                    <Phone className="h-4 w-4" />
                  </a>
                </>
              )}
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-suave">Calculado con los albaranes de los últimos 6 meses (mínimo 3 pedidos por cliente).</p>
    </section>
  );
}
