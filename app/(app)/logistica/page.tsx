import { CalendarClock, Check, ChevronLeft, ChevronRight, FileUp, MessageCircle, Phone, FileDown, FileText, MapPinned, Sparkles, Truck, Warehouse } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Cabecera, Cargando } from "@/components/app/piezas";
import { NuevaRuta } from "@/components/logistica/nueva-ruta";
import { cn } from "@/lib/cn";
import { exigirAdmin } from "@/lib/auth";
import { enlaceLlamada, enlaceWhatsApp } from "@/lib/dominio/contacto";
import { preverPedidos } from "@/lib/dominio/prevision";
import { TEXTO_ESTADO_RUTA, type EstadoRuta } from "@/lib/dominio/reparto";
import { fechaDentroDe } from "@/lib/dominio/visita";
import { supabaseServidor } from "@/lib/supabase/servidor";

export const metadata: Metadata = { title: "Reparto" };

const COLOR_RUTA: Record<EstadoRuta, string> = {
  planificada: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  en_curso: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200",
  terminada: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200",
};

export default function PaginaLogistica({ searchParams }: PageProps<"/logistica">) {
  return (
    <>
      <Cabecera titulo="Reparto" subtitulo="Prepara el reparto del día en 3 pasos" />
      <Suspense fallback={<Cargando />}>
        {searchParams.then((sp) => (
          <Contenido dia={typeof sp.fecha === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.fecha) ? sp.fecha : null} />
        ))}
      </Suspense>
    </>
  );
}

const sumarDias = (d: string, n: number) => new Date(Date.parse(d + "T12:00:00Z") + n * 86_400_000).toISOString().slice(0, 10);
const nombreDia = (f: string, hoy: string) => {
  const largo = new Date(f + "T12:00:00").toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
  const pref = f === hoy ? "Hoy" : f === sumarDias(hoy, 1) ? "Mañana" : f === sumarDias(hoy, -1) ? "Ayer" : null;
  return pref ? `${pref}, ${largo}` : largo.charAt(0).toUpperCase() + largo.slice(1);
};

const nombreCorto = (f: string, hoy: string) => {
  const corto = new Date(f + "T12:00:00").toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" }).replace(/\./g, "");
  const pref = f === hoy ? "Hoy" : f === sumarDias(hoy, 1) ? "Mañana" : f === sumarDias(hoy, -1) ? "Ayer" : null;
  return pref ? `${pref} · ${corto}` : corto;
};

function Paso({ n, titulo, hecho, activo, children }: { n: number; titulo: string; hecho: boolean; activo: boolean; children: React.ReactNode }) {
  return (
    <li className={cn("relative rounded-xl border bg-superficie p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] lg:p-5", activo ? "border-marca/50 ring-1 ring-marca/20" : "border-borde")}>
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
            hecho ? "bg-marca text-marca-texto" : activo ? "bg-marca-suave text-marca ring-1 ring-marca/40" : "bg-fondo text-suave",
          )}
        >
          {hecho ? <Check className="h-4 w-4" strokeWidth={3} /> : n}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">{titulo}</h2>
          <div className="mt-1 space-y-3 text-sm text-suave">{children}</div>
        </div>
      </div>
    </li>
  );
}

const boton = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition lg:min-h-10";
const principal = cn(boton, "bg-marca text-marca-texto shadow-sm hover:brightness-110");
const secundario = cn(boton, "border border-borde bg-superficie text-texto shadow-sm hover:bg-fondo");

async function Contenido({ dia }: { dia: string | null }) {
  await exigirAdmin();
  const hoy = fechaDentroDe(0);
  const fecha = dia ?? hoy;
  const sb = await supabaseServidor();
  const [{ data: rutas }, { data: vehiculos }, { data: perfiles }, { data: almacen }, { data: pendientes }, { count: zonas }] = await Promise.all([
    sb
      .from("rutas")
      .select("id, fecha, estado, notas, vehiculos(nombre, matricula), conductor:perfiles!rutas_conductor_id_fkey(nombre), paradas(estado)")
      .eq("fecha", fecha)
      .order("creado_at"),
    sb.from("vehiculos").select("id, nombre, matricula, conductor_habitual").eq("activo", true).order("nombre"),
    sb.from("perfiles").select("id, nombre").eq("activo", true).order("nombre"),
    sb.from("ajustes_logistica").select("almacen_lat").single(),
    sb.from("albaranes").select("id, destinos(zona_id, lat)").eq("estado", "pendiente"),
    sb.from("zonas_reparto").select("*", { count: "exact", head: true }).eq("activa", true),
  ]);
  const nPend = pendientes?.length ?? 0;
  const sinZona = (pendientes ?? []).filter((a) => !a.destinos?.zona_id).length;
  const sinUbicacion = (pendientes ?? []).filter((a) => a.destinos?.lat == null).length;
  const listo = { almacen: almacen?.almacen_lat != null, vehiculos: !!vehiculos?.length, zonas: !!zonas };
  const configurado = listo.almacen && listo.vehiculos && listo.zonas;
  const hayRutas = !!rutas?.length;
  const pasoActivo = !configurado ? 0 : nPend === 0 && !hayRutas ? 1 : nPend > 0 ? (sinZona || sinUbicacion ? 1 : 2) : 3;

  return (
    <div className="space-y-4 px-4 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-borde bg-superficie p-1.5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <Link href={`/logistica?fecha=${sumarDias(fecha, -1)}`} aria-label="Día anterior" className="rounded-lg p-2.5 text-suave hover:bg-fondo">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <p className="flex-1 text-center font-semibold">
          <span className="hidden sm:inline">{nombreDia(fecha, hoy)}</span>
          <span className="sm:hidden">{nombreCorto(fecha, hoy)}</span>
        </p>
        <div className="flex items-center gap-1">
          {fecha !== hoy && (
            <Link href="/logistica" className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-marca hover:bg-fondo">
              Hoy
            </Link>
          )}
          {fecha !== sumarDias(hoy, 1) && (
            <Link href={`/logistica?fecha=${sumarDias(hoy, 1)}`} className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-marca hover:bg-fondo">
              Mañana
            </Link>
          )}
          <Link href={`/logistica?fecha=${sumarDias(fecha, 1)}`} aria-label="Día siguiente" className="rounded-lg p-2.5 text-suave hover:bg-fondo">
            <ChevronRight className="h-5 w-5" />
          </Link>
        </div>
      </div>

      {!configurado && (
        <section className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900 dark:bg-amber-950/30">
          <h2 className="font-semibold">Antes de empezar (solo la primera vez)</h2>
          <ul className="mt-2 space-y-1.5 text-sm">
            {[
              { ok: listo.almacen, texto: "Marca dónde está tu almacén (punto de salida)", href: "/logistica/vehiculos" },
              { ok: listo.vehiculos, texto: "Da de alta tus vehículos", href: "/logistica/vehiculos" },
              { ok: listo.zonas, texto: "Crea tus zonas y los días que repartes en cada una", href: "/logistica/zonas" },
            ].map((x) => (
              <li key={x.texto} className="flex items-center gap-2">
                <span className={cn("flex h-5 w-5 items-center justify-center rounded-full", x.ok ? "bg-marca text-marca-texto" : "border border-amber-400")}>
                  {x.ok && <Check className="h-3 w-3" strokeWidth={3} />}
                </span>
                {x.ok ? (
                  <span className="text-suave line-through">{x.texto}</span>
                ) : (
                  <Link href={x.href} className="font-medium text-marca underline underline-offset-2">
                    {x.texto}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <ol className="space-y-3">
        <Paso n={1} titulo="Sube los albaranes del día" hecho={nPend > 0 && !sinZona && !sinUbicacion} activo={pasoActivo === 1}>
          {nPend ? (
            <>
              <p>
                <strong className="text-texto">{nPend === 1 ? "1 albarán" : `${nPend} albaranes`}</strong> por repartir.
                {sinZona > 0 && <span className="text-amber-700 dark:text-amber-300"> {sinZona === 1 ? "1 sin zona" : `${sinZona} sin zona`}.</span>}
                {sinUbicacion > 0 && <span className="text-acento"> {sinUbicacion === 1 ? "1 con dirección por revisar" : `${sinUbicacion} con dirección por revisar`}.</span>}
              </p>
              <Link href={`/logistica/albaranes?fecha=${fecha}`} className={sinZona || sinUbicacion ? principal : secundario}>
                <FileText className="h-4 w-4" aria-hidden /> {sinZona || sinUbicacion ? "Revisar zonas y direcciones" : "Ver o añadir albaranes"}
              </Link>
            </>
          ) : (
            <>
              <p>Sube los PDF que descargas de Holded (puedes elegir varios a la vez). La app lee clientes, direcciones, horarios y productos.</p>
              <Link href={`/logistica/albaranes?fecha=${fecha}`} className={principal}>
                <FileUp className="h-4 w-4" aria-hidden /> Subir PDF de Holded
              </Link>
            </>
          )}
        </Paso>

        <Paso n={2} titulo="Calcula la mejor ruta" hecho={hayRutas && nPend === 0} activo={pasoActivo === 2}>
          <p>La app reparte los albaranes entre tus vehículos y ordena las paradas para hacer menos kilómetros y llegar a tiempo a cada horario.</p>
          {nPend ? (
            <Link href={`/logistica/planificar?fecha=${fecha}`} className={pasoActivo === 2 ? principal : secundario}>
              <Sparkles className="h-4 w-4" aria-hidden /> Calcular ruta {nPend > 0 && `(${nPend})`}
            </Link>
          ) : (
            <p className="text-xs">{hayRutas ? "Todos los albaranes ya están en una ruta." : "Primero sube los albaranes."}</p>
          )}
        </Paso>

        <Paso n={3} titulo="Imprime la hoja y sal a repartir" hecho={hayRutas && (rutas ?? []).every((r) => r.estado === "terminada")} activo={pasoActivo === 3}>
          {hayRutas ? (
            <>
              <p>Cada conductor ya tiene su ruta en «Mi reparto». Descarga el PDF con la hoja de carga y el orden de entrega.</p>
              <ul className="space-y-2">
                {rutas!.map((r) => {
                  const hechas = r.paradas.filter((p) => p.estado !== "pendiente").length;
                  return (
                    <li key={r.id} className="overflow-hidden rounded-lg border border-borde">
                      <div className="flex items-center gap-3 p-3">
                        <Truck className="h-5 w-5 shrink-0 text-marca" aria-hidden />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-texto">
                            {r.vehiculos?.nombre ?? "Sin vehículo"}
                            {r.vehiculos?.matricula && <span className="font-normal text-suave"> · {r.vehiculos.matricula}</span>}
                          </p>
                          <p className="text-xs">
                            {r.conductor?.nombre ?? "Sin conductor"} · {hechas} de {r.paradas.length} entregas
                          </p>
                        </div>
                        <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${COLOR_RUTA[r.estado]}`}>{TEXTO_ESTADO_RUTA[r.estado]}</span>
                      </div>
                      <div className="grid grid-cols-2 border-t border-borde text-sm font-medium">
                        <a href={`/api/logistica/rutas/${r.id}/pdf`} target="_blank" rel="noreferrer" className="flex min-h-10 items-center justify-center gap-1.5 text-marca hover:bg-fondo">
                          <FileDown className="h-4 w-4" aria-hidden /> Descargar PDF
                        </a>
                        <Link href={`/logistica/rutas/${r.id}`} className="flex min-h-10 items-center justify-center gap-1.5 border-l border-borde text-texto hover:bg-fondo">
                          Ver paradas <ChevronRight className="h-4 w-4" aria-hidden />
                        </Link>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <p>Aquí aparecerán las rutas del día con su PDF (hoja de carga y orden de reparto).</p>
          )}
        </Paso>
      </ol>

      <Suspense fallback={null}>
        <PrevisionPedidos />
      </Suspense>

      <details className="group rounded-xl border border-borde bg-superficie">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 text-sm font-medium">
          Más opciones
          <ChevronRight className="h-4 w-4 text-suave transition group-open:rotate-90" aria-hidden />
        </summary>
        <div className="space-y-3 border-t border-borde p-4">
          <NuevaRuta fecha={fecha} vehiculos={vehiculos ?? []} conductores={perfiles ?? []} />
          <div className="grid gap-2 sm:grid-cols-2">
            <Link href="/logistica/zonas" className={secundario}>
              <MapPinned className="h-4 w-4 text-marca" aria-hidden /> Zonas y días de reparto
            </Link>
            <Link href="/logistica/vehiculos" className={secundario}>
              <Warehouse className="h-4 w-4 text-marca" aria-hidden /> Vehículos y almacén
            </Link>
          </div>
        </div>
      </details>
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
