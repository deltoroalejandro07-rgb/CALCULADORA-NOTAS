"use client";

import {
  ArrowRight,
  CheckCircle2,
  CircleSlash,
  DoorClosed,
  Flame,
  HelpCircle,
  MapPin,
  Mic,
  MicOff,
  ShoppingCart,
  ThumbsUp,
} from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { pedirSincronizacion } from "@/components/app/sincronizador";
import { Boton } from "@/components/ui/boton";
import { Chip } from "@/components/ui/chip";
import { cn } from "@/lib/cn";
import { siguienteEstado } from "@/lib/dominio/estado";
import {
  TEXTO_ESTADO,
  TEXTO_RESULTADO,
  TEXTO_TIPO_VISITA,
  TIPOS_VISITA,
  type ResultadoVisita,
  type TipoVisita,
} from "@/lib/dominio/tipos";
import {
  fechaDentroDe,
  MATERIALES,
  normalizarTelefono,
  proximoLunes,
  SUGERENCIA_PROXIMA,
} from "@/lib/dominio/visita";
import { fecha } from "@/lib/formato";
import { useDictado, useEnLinea, useUbicacion } from "@/lib/navegador";
import { baseLocal, type ClienteLocal, type ClienteNuevo, type VisitaNueva } from "@/lib/offline/db";
import { encolarVisita } from "@/lib/offline/sincronizar";
import { Fotos, type FotoBorrador } from "./fotos";
import { SelectorCliente, type BorradorCliente } from "./selector-cliente";

const RESULTADOS: { valor: ResultadoVisita; icono: typeof Flame; clase: string }[] = [
  { valor: "no_estaba", icono: DoorClosed, clase: "border-slate-400 bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100" },
  { valor: "sin_interes", icono: CircleSlash, clase: "border-red-500 bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200" },
  { valor: "pide_info", icono: HelpCircle, clase: "border-sky-500 bg-sky-50 text-sky-800 dark:bg-sky-950 dark:text-sky-200" },
  { valor: "interesado", icono: ThumbsUp, clase: "border-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200" },
  { valor: "pide_oferta", icono: Flame, clase: "border-orange-500 bg-orange-50 text-orange-900 dark:bg-orange-950 dark:text-orange-200" },
  { valor: "hace_pedido", icono: ShoppingCart, clase: "border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200" },
];

const CLAVE_TIPO = "crm:ultimo-tipo-visita";

function tipoGuardado(): TipoVisita {
  try {
    const t = localStorage.getItem(CLAVE_TIPO) as TipoVisita | null;
    return t && TIPOS_VISITA.includes(t) ? t : "puerta_fria";
  } catch {
    return "puerta_fria";
  }
}

function Seccion({ titulo, children, opcional }: { titulo: string; children: React.ReactNode; opcional?: boolean }) {
  return (
    <section className="space-y-2">
      <h2 className="px-1 text-[13px] font-semibold text-suave">
        {titulo}
        {opcional && <span className="ml-1 font-normal normal-case tracking-normal">(opcional)</span>}
      </h2>
      {children}
    </section>
  );
}

interface Guardada {
  nombre: string;
  enLinea: boolean;
  clienteId: string;
}

export function FormularioVisita() {
  const { pos, estado: estadoGps } = useUbicacion();
  const enLinea = useEnLinea();
  const idInicial = useSearchParams().get("cliente");

  const [cliente, setCliente] = useState<ClienteLocal | null>(null);
  const [nuevo, setNuevo] = useState<BorradorCliente | null>(null);
  const [tipo, setTipo] = useState<TipoVisita>(tipoGuardado);
  const [resultado, setResultado] = useState<ResultadoVisita | null>(null);
  const [interes, setInteres] = useState("");
  const [nota, setNota] = useState("");
  const [fotos, setFotos] = useState<FotoBorrador[]>([]);
  const [materiales, setMateriales] = useState<string[]>([]);
  const [proxima, setProxima] = useState({ texto: "", fecha: "", tocada: false });
  const [consiente, setConsiente] = useState({ whatsapp: false, email: false });
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [guardada, setGuardada] = useState<Guardada | null>(null);
  const dictado = useDictado((t) => setNota((n) => (n ? `${n} ${t}` : t)));

  // Venir desde la ficha de un cliente: /visita/nueva?cliente=<id>
  const preseleccionado = useLiveQuery(async () => (idInicial ? baseLocal().clientes.get(idInicial) : undefined), [idInicial]);
  const [usadoInicial, setUsadoInicial] = useState(false);
  if (preseleccionado && !usadoInicial) {
    setUsadoInicial(true);
    setCliente(preseleccionado);
  }

  function elegirResultado(r: ResultadoVisita) {
    setResultado(r);
    if (!proxima.tocada) {
      const s = SUGERENCIA_PROXIMA[r];
      setProxima({ texto: s?.texto ?? "", fecha: s ? fechaDentroDe(s.dias) : "", tocada: false });
    }
  }

  function reiniciar() {
    setCliente(null);
    setNuevo(null);
    setResultado(null);
    setInteres("");
    setNota("");
    setFotos([]);
    setMateriales([]);
    setProxima({ texto: "", fecha: "", tocada: false });
    setConsiente({ whatsapp: false, email: false });
    setAviso(null);
    setGuardada(null);
    window.scrollTo({ top: 0 });
  }

  async function guardar() {
    if (!cliente && !nuevo?.nombre_negocio.trim()) return setAviso("Elige o crea el cliente.");
    if (!resultado) return setAviso("Marca el resultado de la visita.");
    setAviso(null);
    setGuardando(true);

    let clienteNuevo: ClienteNuevo | undefined;
    if (nuevo) {
      clienteNuevo = {
        id: crypto.randomUUID(),
        nombre_negocio: nuevo.nombre_negocio.trim(),
        tipo: nuevo.tipo,
        telefono: normalizarTelefono(nuevo.telefono) ?? (nuevo.telefono.trim() || null),
        contacto_nombre: nuevo.contacto_nombre.trim() || null,
        lat: pos?.lat ?? null,
        lng: pos?.lng ?? null,
      };
    }
    const clienteId = clienteNuevo?.id ?? cliente!.id;

    const visita: VisitaNueva = {
      id: crypto.randomUUID(),
      cliente_id: clienteId,
      fecha: new Date().toISOString(),
      lat: pos?.lat ?? null,
      lng: pos?.lng ?? null,
      precision_m: pos ? Math.round(pos.precision) : null,
      tipo,
      resultado,
      material_entregado: materiales,
      notas: nota.trim() || null,
      proxima_accion: proxima.texto.trim() || null,
      proxima_accion_fecha: proxima.fecha || null,
      productos: [],
      interes_texto: interes.trim() || null,
      fotos: fotos.map((f) => ({ id: f.id, tipo: f.tipo })),
      consentimientos: (["whatsapp", "email"] as const).filter((c) => consiente[c]).map((canal) => ({ id: crypto.randomUUID(), canal })),
    };

    try {
      await encolarVisita(baseLocal(), visita, fotos, clienteNuevo);
      try {
        localStorage.setItem(CLAVE_TIPO, tipo);
      } catch {}
      navigator.vibrate?.(60);
      setGuardada({ nombre: clienteNuevo?.nombre_negocio ?? cliente!.nombre_negocio, enLinea: navigator.onLine, clienteId });
      pedirSincronizacion();
    } catch {
      setAviso("No se ha podido guardar en el móvil. ¿Queda espacio libre?");
    } finally {
      setGuardando(false);
    }
  }

  if (guardada) {
    return (
      <div className="flex flex-col items-center px-6 pt-16 text-center">
        <CheckCircle2 className="h-20 w-20 text-emerald-500" aria-hidden />
        <h2 className="mt-4 text-2xl font-bold">Visita guardada</h2>
        <p className="mt-1 text-lg">{guardada.nombre}</p>
        <p className="mt-2 text-sm text-suave">
          {guardada.enLinea ? "Se está subiendo ahora." : "Sin cobertura: está guardada en el móvil y se subirá sola cuando vuelva la conexión."}
        </p>
        <div className="mt-8 w-full max-w-xs space-y-3">
          <Boton className="w-full" onClick={reiniciar}>
            Registrar otra visita
          </Boton>
          <Link href="/hoy" className="flex min-h-12 items-center justify-center rounded-lg border border-borde bg-superficie font-semibold">
            Volver a Hoy
          </Link>
        </div>
      </div>
    );
  }

  const estadoActual = cliente?.estado ?? (nuevo ? "prospecto" : null);
  const estadoNuevo = estadoActual && resultado ? siguienteEstado(estadoActual, resultado) : null;
  const faltaConsentimiento = nuevo ? { whatsapp: true, email: true } : cliente ? { whatsapp: !cliente.consiente_whatsapp, email: !cliente.consiente_email } : null;
  const campo = "w-full rounded-lg border border-borde bg-superficie px-4 py-3 text-base outline-none focus:border-marca focus:ring-2 focus:ring-marca/30";

  return (
    <div className="space-y-6 px-4 pb-28">
      <Seccion titulo="Cliente">
        <SelectorCliente seleccionado={cliente} onSeleccionar={(c) => { setCliente(c); setNuevo(null); }} nuevo={nuevo} onNuevo={setNuevo} pos={pos} />
        {estadoGps === "sin-permiso" && (
          <p className="flex items-center gap-1 px-1 text-xs text-suave">
            <MapPin className="h-3.5 w-3.5" aria-hidden /> Sin permiso de ubicación: no se ordenará por cercanía ni se guardará dónde fue la visita.
          </p>
        )}
      </Seccion>

      <Seccion titulo="Resultado">
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Resultado de la visita">
          {RESULTADOS.map(({ valor, icono: Icono, clase }) => (
            <button
              key={valor}
              type="button"
              role="radio"
              aria-checked={resultado === valor}
              onClick={() => elegirResultado(valor)}
              className={cn(
                "flex min-h-16 items-center gap-2 rounded-xl border-2 px-3 text-left text-sm font-semibold leading-tight transition active:scale-[0.97]",
                resultado === valor ? clase : "border-borde bg-superficie",
              )}
            >
              <Icono className="h-6 w-6 shrink-0" aria-hidden />
              {TEXTO_RESULTADO[valor]}
            </button>
          ))}
        </div>
        {estadoActual && estadoNuevo && estadoNuevo !== estadoActual && (
          <p className="flex items-center gap-1.5 rounded-lg bg-marca-suave px-3 py-2 text-sm">
            Pasará de <strong>{TEXTO_ESTADO[estadoActual]}</strong> <ArrowRight className="h-4 w-4" aria-hidden /> <strong>{TEXTO_ESTADO[estadoNuevo]}</strong>
          </p>
        )}
      </Seccion>

      <Seccion titulo="Tipo de visita">
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Tipo de visita">
          {TIPOS_VISITA.map((t) => (
            <Chip key={t} activo={tipo === t} onClick={() => setTipo(t)} role="radio" aria-checked={tipo === t}>
              {TEXTO_TIPO_VISITA[t]}
            </Chip>
          ))}
        </div>
      </Seccion>

      <Seccion titulo="¿Qué productos le interesan?" opcional>
        <input
          value={interes}
          onChange={(e) => setInteres(e.target.value)}
          maxLength={1000}
          placeholder="Cerveza de barril, agua con gas, café…"
          aria-label="Productos que le interesan"
          className="min-h-12 w-full rounded-lg border border-borde bg-superficie px-3 outline-none focus:border-marca"
        />
      </Seccion>

      <Seccion titulo="Nota" opcional>
        <div className="relative">
          <textarea
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            rows={3}
            placeholder="Qué ha dicho, qué proveedor tiene, cuándo decide…"
            aria-label="Nota"
            className={`${campo} resize-y pr-14`}
          />
          {dictado.disponible && (
            <button
              type="button"
              onClick={dictado.alternar}
              aria-label={dictado.escuchando ? "Parar dictado" : "Dictar nota"}
              aria-pressed={dictado.escuchando}
              className={cn(
                "absolute bottom-2 right-2 rounded-full p-2.5",
                dictado.escuchando ? "animate-pulse bg-red-600 text-white" : "bg-fondo text-suave",
              )}
            >
              {dictado.escuchando ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>
          )}
        </div>
      </Seccion>

      <Seccion titulo="Fotos" opcional>
        <Fotos fotos={fotos} onCambio={setFotos} />
      </Seccion>

      <Seccion titulo="Material entregado" opcional>
        <div className="flex flex-wrap gap-2">
          {MATERIALES.map((m) => (
            <Chip
              key={m}
              activo={materiales.includes(m)}
              onClick={() => setMateriales((a) => (a.includes(m) ? a.filter((x) => x !== m) : [...a, m]))}
            >
              {m}
            </Chip>
          ))}
        </div>
      </Seccion>

      <Seccion titulo="Próxima acción">
        <input
          value={proxima.texto}
          onChange={(e) => setProxima({ ...proxima, texto: e.target.value, tocada: true })}
          placeholder="Qué hay que hacer"
          aria-label="Próxima acción"
          className={campo}
        />
        <div className="flex flex-wrap items-center gap-2">
          {[
            { texto: "Mañana", fecha: fechaDentroDe(1) },
            { texto: "En 3 días", fecha: fechaDentroDe(3) },
            { texto: "Próx. semana", fecha: proximoLunes() },
          ].map((o) => (
            <Chip key={o.texto} activo={proxima.fecha === o.fecha} onClick={() => setProxima({ ...proxima, fecha: o.fecha, tocada: true })}>
              {o.texto}
            </Chip>
          ))}
          <label className="relative">
            <span className="sr-only">Elegir fecha</span>
            <input
              type="date"
              value={proxima.fecha}
              min={fechaDentroDe(0)}
              onChange={(e) => setProxima({ ...proxima, fecha: e.target.value, tocada: true })}
              className="min-h-11 rounded-full border border-borde bg-superficie px-3 text-sm"
            />
          </label>
        </div>
        {proxima.fecha && (
          <p className="px-1 text-sm text-suave">
            Para el <strong className="text-texto">{fecha(proxima.fecha)}</strong>
            <button type="button" onClick={() => setProxima({ ...proxima, fecha: "", tocada: true })} className="ml-2 underline">
              sin fecha
            </button>
          </p>
        )}
      </Seccion>

      {faltaConsentimiento && (faltaConsentimiento.whatsapp || faltaConsentimiento.email) && (
        <Seccion titulo="Comunicaciones comerciales">
          <div className="space-y-2 rounded-xl border border-borde bg-superficie p-4">
            <p className="text-sm text-suave">¿Ha aceptado recibir ofertas? Márcalo solo si lo ha dicho expresamente.</p>
            <div className="flex flex-wrap gap-2">
              {faltaConsentimiento.whatsapp && (
                <Chip activo={consiente.whatsapp} onClick={() => setConsiente({ ...consiente, whatsapp: !consiente.whatsapp })}>
                  Acepta WhatsApp
                </Chip>
              )}
              {faltaConsentimiento.email && (
                <Chip activo={consiente.email} onClick={() => setConsiente({ ...consiente, email: !consiente.email })}>
                  Acepta email
                </Chip>
              )}
            </div>
          </div>
        </Seccion>
      )}

      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 lg:bottom-0 lg:left-64 border-t border-borde bg-fondo/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto max-w-lg">
          {aviso && <p className="mb-2 text-center text-sm font-medium text-red-600 dark:text-red-400" role="alert">{aviso}</p>}
          <Boton className="w-full text-lg" onClick={guardar} cargando={guardando}>
            Guardar visita
            {!enLinea && <span className="text-sm font-normal opacity-80">(sin cobertura)</span>}
          </Boton>
        </div>
      </div>
    </div>
  );
}
