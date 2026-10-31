"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { AlertTriangle, CalendarDays, Check, ChevronLeft, ChevronRight, ClipboardList, CloudOff, CloudUpload, Loader2, Navigation, Phone, RefreshCw, Truck, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Boton } from "@/components/ui/boton";
import { cn } from "@/lib/cn";
import { enlaceComoLlegar, enlaceLlamada } from "@/lib/dominio/contacto";
import { direccionParada, lineasIniciales, ordenCarga, progreso, siguienteParada, totalCarga, type EstadoParada, type ParadaReparto, type RutaReparto } from "@/lib/dominio/reparto";
import { enlaceRutaGoogle } from "@/lib/dominio/ruta";
import { fechaDentroDe } from "@/lib/dominio/visita";
import { fecha as formatoFecha, fechaHora } from "@/lib/formato";
import { useEnLinea } from "@/lib/navegador";
import { baseReparto, descargarRutas, guardarEntrega, limpiarAntiguas, reintentarErrores, sincronizarReparto, type EntregaLocal } from "@/lib/offline/reparto";
import { supabaseNavegador } from "@/lib/supabase/navegador";
import { RegistrarEntrega } from "./registrar-entrega";

const CLAVE_USUARIO = "reparto:usuario";

/** Usuario de la sesión. Sin red, el último conocido, pero solo si la sesión sigue abierta en este móvil. */
async function quienSoy(): Promise<string | null> {
  try {
    const { data } = await supabaseNavegador().auth.getSession();
    const id = data.session?.user.id;
    if (id) {
      localStorage.setItem(CLAVE_USUARIO, id);
      return id;
    }
  } catch {}
  const haySesion = document.cookie.split(";").some((c) => /-auth-token/.test(c));
  try {
    return haySesion ? localStorage.getItem(CLAVE_USUARIO) : null;
  } catch {
    return null;
  }
}

/** Posición del móvil si se obtiene rápido (máx. 2 s); si no, se entrega sin ella. */
function posicionRapida(): Promise<{ lat: number; lng: number; precision: number } | null> {
  return new Promise((ok) => {
    if (!("geolocation" in navigator)) return ok(null);
    navigator.geolocation.getCurrentPosition(
      (p) => ok({ lat: p.coords.latitude, lng: p.coords.longitude, precision: p.coords.accuracy }),
      () => ok(null),
      { maximumAge: 120_000, timeout: 2000 },
    );
  });
}

function avisarServiceWorker(mensaje: "preferir-reparto" | "preferir-visita") {
  // `ready` espera a que haya un service worker activo (recién instalado puede no controlar aún la página)
  void navigator.serviceWorker?.ready.then((r) => r.active?.postMessage(mensaje)).catch(() => {});
}

type Vista = { tipo: "lista" } | { tipo: "parada"; id: string } | { tipo: "entrega"; id: string; modo: "entregada" | "fallida" } | { tipo: "carga" };

const nombreDia = (f: string) => (f === fechaDentroDe(0) ? "Hoy" : f === fechaDentroDe(1) ? "Mañana" : f === fechaDentroDe(-1) ? "Ayer" : formatoFecha(f));

export function PanelReparto() {
  const enLinea = useEnLinea();
  const [usuarioId, setUsuarioId] = useState<string | null | undefined>(undefined);
  const [rutaSel, setRutaSel] = useState<string | null>(null);
  const [vista, setVista] = useState<Vista>({ tipo: "lista" });
  const [actualizando, setActualizando] = useState(false);
  const [ultimaDescarga, setUltimaDescarga] = useState<number | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const rutas = useLiveQuery(async () => (usuarioId ? (await baseReparto().rutas.where("usuario_id").equals(usuarioId).toArray()).sort((a, b) => a.fecha.localeCompare(b.fecha)) : []), [usuarioId], undefined);
  const entregas = useLiveQuery(async () => (usuarioId ? baseReparto().entregas.where("usuario_id").equals(usuarioId).toArray() : []), [usuarioId], [] as EntregaLocal[]);

  const actualizar = useCallback(async (id: string) => {
    if (!navigator.onLine) return;
    setActualizando(true);
    try {
      const sb = supabaseNavegador();
      const db = baseReparto();
      await sincronizarReparto(sb, db, id); // primero subir lo hecho
      await descargarRutas(sb, db, id); // luego traer cambios de la oficina
      await limpiarAntiguas(db, id);
      setUltimaDescarga(Date.now());
    } catch {
      // Sin red a mitad: se reintenta en el siguiente aviso
    } finally {
      setActualizando(false);
    }
  }, []);

  useEffect(() => {
    let id: string | null = null;
    void quienSoy().then((u) => {
      id = u;
      setUsuarioId(u);
      if (u) {
        void navigator.storage?.persist?.().catch(() => {}); // que el navegador no borre las firmas guardadas
        void actualizar(u);
      }
    });
    const lanzar = () => id && void actualizar(id);
    const alVolver = () => document.visibilityState === "visible" && lanzar();
    window.addEventListener("online", lanzar);
    document.addEventListener("visibilitychange", alVolver);
    const intervalo = setInterval(lanzar, 60_000);
    return () => {
      window.removeEventListener("online", lanzar);
      document.removeEventListener("visibilitychange", alVolver);
      clearInterval(intervalo);
    };
  }, [actualizar]);

  const locales = useMemo(() => new Map(entregas.map((e) => [e.parada_id, e])), [entregas]);
  const hechasEnMovil = useMemo(() => new Set(entregas.map((e) => e.parada_id)), [entregas]);
  const lista = useMemo(() => (rutas ?? []).map((r) => r.datos), [rutas]);
  const hoy = fechaDentroDe(0);
  const ruta: RutaReparto | null = lista.find((r) => r.id === rutaSel) ?? lista.find((r) => r.fecha === hoy) ?? lista.find((r) => progreso(r.paradas, hechasEnMovil).hechas < r.paradas.length) ?? lista[0] ?? null;

  // Sin red, llevar al conductor a su ruta (y no a "Nueva visita") mientras le queden paradas hoy
  useEffect(() => {
    if (!rutas) return;
    const pendienteHoy = lista.some((r) => r.fecha <= hoy && progreso(r.paradas, hechasEnMovil).hechas < r.paradas.length);
    avisarServiceWorker(pendienteHoy ? "preferir-reparto" : "preferir-visita");
  }, [rutas, lista, hoy, hechasEnMovil]);

  const pendientes = entregas.filter((e) => e.subida === "pendiente").length;
  const conflictos = entregas.filter((e) => e.subida === "conflicto");
  const conError = entregas.filter((e) => e.subida === "error");

  if (usuarioId === undefined || rutas === undefined) {
    return (
      <div className="flex items-center justify-center gap-2 p-8 text-suave">
        <Loader2 className="h-5 w-5 animate-spin" /> Cargando tu ruta…
      </div>
    );
  }
  if (!usuarioId) {
    return <p className="mx-4 rounded-xl border border-borde bg-superficie p-4 text-sm">Abre la app con cobertura e inicia sesión para descargar tu ruta.</p>;
  }

  const estadoDe = (p: ParadaReparto): { estado: EstadoParada; local?: EntregaLocal } => {
    const local = locales.get(p.id);
    return local ? { estado: local.estado, local } : { estado: p.estado };
  };

  const paradaVista = vista.tipo === "parada" || vista.tipo === "entrega" ? ruta?.paradas.find((p) => p.id === vista.id) : undefined;

  /** Entregado tal cual (todo lo del albarán), de un toque. Se guarda en el móvil y se sube solo. */
  async function entregarRapido(p: ParadaReparto) {
    if (!ruta || !usuarioId || hechasEnMovil.has(p.id)) return;
    if (!confirm(`¿Marcar ${p.cliente.nombre} como entregado?`)) return;
    const pos = await posicionRapida();
    await guardarEntrega(
      baseReparto(),
      {
        id: crypto.randomUUID(),
        parada_id: p.id,
        ruta_id: ruta.id,
        usuario_id: usuarioId,
        estado: "entregada",
        datos: {
          realizada_at: new Date().toISOString(),
          firmante: null,
          lineas: lineasIniciales(p.lineas),
          envases_entregados: 0,
          envases_recogidos: 0,
          cobrado: null,
          forma_cobro: null,
          motivo_fallo: null,
          observaciones: null,
          lat: pos?.lat ?? null,
          lng: pos?.lng ?? null,
          precision_m: pos?.precision ?? null,
        },
      },
      null,
      [],
    );
    setVista({ tipo: "lista" });
    setAviso(`✓ ${p.cliente.nombre}: entregado`);
    window.scrollTo({ top: 0 });
    void actualizar(usuarioId);
  }

  if (vista.tipo === "entrega" && ruta && paradaVista) {
    return (
      <RegistrarEntrega
        parada={paradaVista}
        rutaId={ruta.id}
        usuarioId={usuarioId}
        modo={vista.modo}
        alCancelar={() => setVista({ tipo: "parada", id: paradaVista.id })}
        alGuardar={() => {
          setVista({ tipo: "lista" });
          setAviso(vista.modo === "entregada" ? `✓ Entrega en ${paradaVista.cliente.nombre} guardada` : `Incidencia en ${paradaVista.cliente.nombre} guardada`);
          window.scrollTo({ top: 0 });
          void actualizar(usuarioId);
        }}
      />
    );
  }

  const barraEstado = (
    <div className="space-y-2 px-4">
      {!enLinea && (
        <p className="flex items-center gap-2 rounded-lg bg-slate-200 px-3 py-2 text-sm font-medium text-slate-800 dark:bg-slate-700 dark:text-slate-100">
          <CloudOff className="h-4 w-4 shrink-0" aria-hidden /> Sin cobertura: puedes seguir entregando, todo se guarda en el móvil.
        </p>
      )}
      {pendientes > 0 && (
        <p className="flex items-center gap-2 rounded-lg bg-amber-100 px-3 py-2 text-sm font-medium text-amber-900 dark:bg-amber-900/60 dark:text-amber-100">
          {actualizando ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden /> : <CloudUpload className="h-4 w-4 shrink-0" aria-hidden />}
          {pendientes} {pendientes === 1 ? "entrega guardada" : "entregas guardadas"} en el móvil{enLinea ? ", subiendo…" : ": se subirán solas con cobertura"}
        </p>
      )}
      {conflictos.length > 0 && (
        <p role="alert" className="flex items-start gap-2 rounded-lg bg-red-100 px-3 py-2 text-sm font-medium text-red-800 dark:bg-red-900/60 dark:text-red-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {conflictos.length === 1 ? "Una entrega ya estaba registrada" : `${conflictos.length} entregas ya estaban registradas`} desde otro móvil. Lo tuyo sigue guardado aquí: avisa a la oficina.
        </p>
      )}
      {conError.length > 0 && (
        <div role="alert" className="rounded-lg bg-red-100 px-3 py-2 text-sm text-red-800 dark:bg-red-900/60 dark:text-red-100">
          <p className="flex items-center gap-2 font-medium">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden /> {conError.length} sin poder subir: {conError[0].error}
          </p>
          <button
            type="button"
            className="mt-1 underline"
            onClick={async () => {
              await reintentarErrores(baseReparto(), usuarioId);
              void actualizar(usuarioId);
            }}
          >
            Reintentar
          </button>
        </div>
      )}
      {aviso && (
        <p className="flex items-center justify-between gap-2 rounded-lg bg-emerald-100 px-3 py-2 text-sm font-medium text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-100">
          {aviso}
          <button type="button" onClick={() => setAviso(null)} aria-label="Cerrar aviso">
            <X className="h-4 w-4" />
          </button>
        </p>
      )}
    </div>
  );

  if (!ruta) {
    return (
      <div className="space-y-3">
        {barraEstado}
        <div className="mx-4 rounded-xl border border-dashed border-borde p-6 text-center">
          <Truck className="mx-auto h-8 w-8 text-suave" aria-hidden />
          <p className="mt-2 font-medium">No tienes rutas de reparto asignadas.</p>
          <p className="text-sm text-suave">Cuando la oficina te asigne una, aparecerá aquí.</p>
          {enLinea && (
            <Boton type="button" variante="secundario" className="mt-3" cargando={actualizando} onClick={() => actualizar(usuarioId)}>
              <RefreshCw className="h-5 w-5" aria-hidden /> Actualizar
            </Boton>
          )}
        </div>
        {enLinea && (
          <Link href="/reparto/dias" className="mx-4 flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-borde bg-superficie text-sm font-medium active:bg-fondo">
            <CalendarDays className="h-4 w-4" aria-hidden /> Ver rutas por días (días pasados)
          </Link>
        )}
      </div>
    );
  }

  const ordenadas = [...ruta.paradas].sort((a, b) => a.orden - b.orden);
  const siguiente = siguienteParada(ordenadas, hechasEnMovil);
  const { hechas, total } = progreso(ordenadas, hechasEnMovil);
  const conUbicacion = ordenadas.filter((p) => !hechasEnMovil.has(p.id) && p.estado === "pendiente" && p.cliente.lat != null && p.cliente.lng != null).map((p) => ({ lat: p.cliente.lat!, lng: p.cliente.lng! }));
  const enlaceRuta = enlaceRutaGoogle(conUbicacion);

  // ---------- Detalle de una parada ----------
  if (vista.tipo === "parada" && paradaVista) {
    const { estado, local } = estadoDe(paradaVista);
    return (
      <div className="space-y-4 px-4 pb-8">
        <button type="button" onClick={() => setVista({ tipo: "lista" })} className="inline-flex min-h-11 items-center gap-1 text-sm text-suave">
          <ChevronLeft className="h-5 w-5" aria-hidden /> Ruta
        </button>
        <FichaParada parada={paradaVista} estado={estado} local={local} destacada={estado === "pendiente"} onEntregar={(modo) => setVista({ tipo: "entrega", id: paradaVista.id, modo })} onRapido={() => entregarRapido(paradaVista)} />
      </div>
    );
  }

  // ---------- Hoja de carga ----------
  if (vista.tipo === "carga") {
    const porEntregar = ordenadas.filter((p) => estadoDe(p).estado === "pendiente");
    const numero = new Map(ordenadas.map((p, i) => [p.id, i + 1]));
    return (
      <div className="space-y-4 px-4 pb-8">
        <button type="button" onClick={() => setVista({ tipo: "lista" })} className="inline-flex min-h-11 items-center gap-1 text-sm text-suave">
          <ChevronLeft className="h-5 w-5" aria-hidden /> Ruta
        </button>
        <h2 className="text-xl font-bold">Hoja de carga</h2>
        <div className="rounded-xl border border-borde bg-superficie p-4">
          <p className="mb-2 font-semibold">Total a cargar</p>
          <ul className="divide-y divide-borde text-sm">
            {totalCarga(porEntregar).map((l) => (
              <li key={l.clave} className="flex justify-between py-2">
                <span>{l.descripcion}</span>
                <span className="font-semibold tabular-nums">{l.cantidad.toLocaleString("es-ES")}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-borde bg-superficie p-4">
          <p className="font-semibold">Orden de carga</p>
          <p className="mb-2 text-sm text-suave">Lo último que se entrega, al fondo.</p>
          <ol className="space-y-2 text-sm">
            {ordenCarga(porEntregar).map((p) => (
              <li key={p.id}>
                <span className="font-semibold">
                  {numero.get(p.id)}. {p.cliente.nombre}
                </span>
                <span className="block text-suave">{p.lineas.map((l) => `${Number(l.cantidad).toLocaleString("es-ES")} × ${l.descripcion}`).join(", ") || "Sin productos"}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    );
  }

  // ---------- Lista de la ruta ----------
  return (
    <div className="space-y-4 pb-8">
      {barraEstado}

      {lista.length > 1 && (
        <div className="flex gap-2 overflow-x-auto px-4">
          {lista.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRutaSel(r.id)}
              className={cn("min-h-11 shrink-0 rounded-full border px-4 text-sm font-medium", r.id === ruta.id ? "border-marca bg-marca-suave" : "border-borde bg-superficie")}
            >
              {nombreDia(r.fecha)} · {r.vehiculo?.nombre ?? "Ruta"}
            </button>
          ))}
        </div>
      )}

      <section className="mx-4 rounded-xl border border-borde bg-superficie p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-lg font-bold">
              {nombreDia(ruta.fecha)}
              {ruta.vehiculo && <span className="font-normal text-suave"> · {ruta.vehiculo.nombre}{ruta.vehiculo.matricula && ` (${ruta.vehiculo.matricula})`}</span>}
            </p>
            <p className="text-sm text-suave">
              {hechas} de {total} paradas
              {ultimaDescarga && enLinea && ` · actualizada ${new Date(ultimaDescarga).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`}
            </p>
          </div>
          {enLinea && (
            <button type="button" onClick={() => actualizar(usuarioId)} aria-label="Actualizar ruta" className="rounded-full p-2 text-suave active:bg-fondo">
              <RefreshCw className={cn("h-5 w-5", actualizando && "animate-spin")} />
            </button>
          )}
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-fondo" role="progressbar" aria-valuenow={hechas} aria-valuemax={total} aria-label="Progreso de la ruta">
          <div className="h-full rounded-full bg-marca transition-all" style={{ width: `${total ? (hechas / total) * 100 : 0}%` }} />
        </div>
        {ruta.notas && <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">Oficina: {ruta.notas}</p>}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setVista({ tipo: "carga" })} className="flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-borde text-sm font-medium active:bg-fondo">
            <ClipboardList className="h-4 w-4" aria-hidden /> Hoja de carga
          </button>
          {enlaceRuta ? (
            <a href={enlaceRuta} target="_blank" rel="noreferrer" className="flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-borde text-sm font-medium active:bg-fondo">
              <Navigation className="h-4 w-4" aria-hidden /> Ruta en Maps
            </a>
          ) : (
            <span />
          )}
        </div>
      </section>

      {enLinea && (
        <Link href="/reparto/dias" className="mx-4 flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-borde bg-superficie text-sm font-medium active:bg-fondo">
          <CalendarDays className="h-4 w-4" aria-hidden /> Ver rutas por días (días pasados)
        </Link>
      )}

      {siguiente ? (
        <section className="px-4">
          <p className="mb-1 text-[13px] font-semibold text-suave">Siguiente parada</p>
          <FichaParada parada={siguiente} estado="pendiente" destacada numero={ordenadas.indexOf(siguiente) + 1} onEntregar={(modo) => setVista({ tipo: "entrega", id: siguiente.id, modo })} onRapido={() => entregarRapido(siguiente)} />
        </section>
      ) : (
        total > 0 && (
          <p className="mx-4 rounded-xl bg-emerald-100 p-4 text-center font-semibold text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-100">
            ✓ Ruta terminada{pendientes ? ". Se subirá todo al tener cobertura." : "."}
          </p>
        )
      )}

      <section>
        <p className="mb-1 px-4 text-[13px] font-semibold text-suave">Todas las paradas</p>
        <ol className="divide-y divide-borde border-y border-borde bg-superficie lg:mx-4 lg:overflow-hidden lg:rounded-xl lg:border-x">
          {ordenadas.map((p, i) => {
            const { estado, local } = estadoDe(p);
            return (
              <li key={p.id}>
                <button type="button" onClick={() => setVista({ tipo: "parada", id: p.id })} className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-fondo">
                  <NumeroParada n={i + 1} estado={estado} />
                  <span className="min-w-0 flex-1">
                    <span className={cn("block truncate font-medium", estado !== "pendiente" && "text-suave")}>{p.cliente.nombre}</span>
                    <span className="block truncate text-xs text-suave">
                      {estado === "pendiente"
                        ? [p.llegada_prevista && `≈ ${p.llegada_prevista}`, p.cliente.horario_entrega, direccionParada(p.cliente)].filter(Boolean).join(" · ") || "Sin dirección"
                        : `${estado === "entregada" ? "Entregada" : "No entregada"} ${local ? fechaHora(local.datos.realizada_at) : p.realizada_at ? fechaHora(p.realizada_at) : ""}`}
                    </span>
                  </span>
                  {local?.subida === "pendiente" && <CloudUpload className="h-4 w-4 shrink-0 text-amber-600" aria-label="Guardada en el móvil, pendiente de subir" />}
                  {local?.subida === "conflicto" && <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" aria-label="Conflicto" />}
                  <ChevronRight className="h-5 w-5 shrink-0 text-suave" aria-hidden />
                </button>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}

function NumeroParada({ n, estado }: { n: number; estado: EstadoParada }) {
  return (
    <span
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
        estado === "entregada" && "bg-emerald-600 text-white",
        estado === "fallida" && "bg-red-600 text-white",
        estado === "pendiente" && "bg-marca text-marca-texto",
      )}
    >
      {estado === "entregada" ? <Check className="h-4 w-4" aria-label="Entregada" /> : estado === "fallida" ? <X className="h-4 w-4" aria-label="No entregada" /> : n}
    </span>
  );
}

function FichaParada({
  parada,
  estado,
  local,
  destacada,
  numero,
  onEntregar,
  onRapido,
}: {
  parada: ParadaReparto;
  estado: EstadoParada;
  local?: EntregaLocal;
  destacada?: boolean;
  numero?: number;
  onEntregar: (modo: "entregada" | "fallida") => void;
  /** Entregado tal cual, de un toque (la firma va en el albarán de papel). */
  onRapido: () => void;
}) {
  const c = parada.cliente;
  const comoLlegar = enlaceComoLlegar({ lat: c.lat, lng: c.lng, direccion: c.direccion, localidad: c.localidad });
  return (
    <div className={cn("rounded-xl border bg-superficie p-4", destacada ? "border-marca shadow-sm" : "border-borde")}>
      <div className="flex items-start gap-3">
        {numero != null && <NumeroParada n={numero} estado={estado} />}
        <div className="min-w-0 flex-1">
          <p className="text-lg font-bold leading-tight">{c.nombre}</p>
          <p className="text-sm text-suave">{direccionParada(c) || "Sin dirección"}</p>
          {(parada.llegada_prevista || parada.albaran) && (
            <p className="text-xs text-suave">
              {parada.llegada_prevista && <span className="font-semibold text-marca">Llegada prevista {parada.llegada_prevista}</span>}
              {parada.llegada_prevista && parada.albaran && " · "}
              {parada.albaran && `Albarán ${parada.albaran}`}
            </p>
          )}
        </div>
      </div>
      {(c.horario_entrega || c.notas_acceso || parada.notas_oficina) && (
        <div className="mt-3 space-y-1 rounded-lg bg-fondo p-3 text-sm">
          {c.horario_entrega && <p>🕘 Descarga: {c.horario_entrega}</p>}
          {c.notas_acceso && <p>🚪 {c.notas_acceso}</p>}
          {parada.notas_oficina && <p className="font-medium text-amber-700 dark:text-amber-300">📝 {parada.notas_oficina}</p>}
        </div>
      )}
      {parada.lineas.length > 0 && (
        <ul className="mt-3 text-sm">
          {parada.lineas.map((l, i) => (
            <li key={i}>
              <span className="font-semibold tabular-nums">{Number(l.cantidad).toLocaleString("es-ES")}</span> × {l.descripcion}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 grid grid-cols-2 gap-2">
        {comoLlegar && (
          <a href={comoLlegar} target="_blank" rel="noreferrer" className="flex min-h-12 items-center justify-center gap-1.5 rounded-lg border border-borde font-medium active:bg-fondo">
            <Navigation className="h-5 w-5" aria-hidden /> Navegar
          </a>
        )}
        {c.telefono && (
          <a href={enlaceLlamada(c.telefono)} className="flex min-h-12 items-center justify-center gap-1.5 rounded-lg border border-borde font-medium active:bg-fondo">
            <Phone className="h-5 w-5" aria-hidden /> Llamar
          </a>
        )}
      </div>
      {estado === "pendiente" ? (
        <>
          <Boton type="button" onClick={onRapido} className="mt-3 min-h-14 w-full text-lg">
            <Check className="h-6 w-6" aria-hidden /> Entregado
          </Boton>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => onEntregar("entregada")} className="min-h-11 rounded-lg border border-borde text-sm font-medium active:bg-fondo">
              Con cambios
              <span className="block text-[11px] font-normal text-suave">falta algo, envases, cobro</span>
            </button>
            <button type="button" onClick={() => onEntregar("fallida")} className="min-h-11 rounded-lg border border-red-200 text-sm font-medium text-red-700 active:bg-fondo dark:border-red-900 dark:text-red-300">
              No entregado
              <span className="block text-[11px] font-normal opacity-75">cerrado, no lo quiere…</span>
            </button>
          </div>
        </>
      ) : (
        <p className={cn("mt-3 rounded-lg p-3 text-sm font-medium", estado === "entregada" ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-100" : "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-100")}>
          {estado === "entregada" ? "✓ Entregada" : `No entregada${local?.datos.motivo_fallo ? `: ${local.datos.motivo_fallo}` : ""}`}
          {local?.subida === "pendiente" && " · guardada en el móvil, se subirá con cobertura"}
          {local?.subida === "subida" && " · subida"}
        </p>
      )}
    </div>
  );
}
