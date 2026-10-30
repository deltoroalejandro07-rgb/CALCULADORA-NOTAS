"use client";

import { Camera, ChevronLeft, Loader2, Minus, Plus, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { Boton } from "@/components/ui/boton";
import { Chip } from "@/components/ui/chip";
import { cn } from "@/lib/cn";
import {
  cambiarCantidad,
  esEntregaParcial,
  FORMAS_COBRO,
  leerImporte,
  lineasIniciales,
  MOTIVOS_FALLO,
  validarEntrega,
  type LineaEntrega,
  type ParadaReparto,
} from "@/lib/dominio/reparto";
import { comprimirFoto, useUbicacion } from "@/lib/navegador";
import { baseReparto, guardarEntrega } from "@/lib/offline/reparto";
import { Firma, type PanelFirma } from "./firma";

const campo = "mt-1 min-h-12 w-full rounded-xl border border-borde bg-superficie px-3 outline-none focus:border-marca";

function Contador({ valor, alCambiar, etiqueta }: { valor: number; alCambiar: (v: number) => void; etiqueta: string }) {
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => alCambiar(Math.max(0, valor - 1))} aria-label={`Menos ${etiqueta}`} className="flex h-11 w-11 items-center justify-center rounded-full border border-borde active:bg-fondo">
        <Minus className="h-5 w-5" />
      </button>
      <span className="w-10 text-center text-lg font-bold tabular-nums" aria-label={etiqueta}>
        {valor.toLocaleString("es-ES")}
      </span>
      <button type="button" onClick={() => alCambiar(valor + 1)} aria-label={`Más ${etiqueta}`} className="flex h-11 w-11 items-center justify-center rounded-full border border-borde active:bg-fondo">
        <Plus className="h-5 w-5" />
      </button>
    </div>
  );
}

export function RegistrarEntrega({
  parada,
  rutaId,
  usuarioId,
  modo,
  alGuardar,
  alCancelar,
}: {
  parada: ParadaReparto;
  rutaId: string;
  usuarioId: string;
  modo: "entregada" | "fallida";
  alGuardar: () => void;
  alCancelar: () => void;
}) {
  const { pos } = useUbicacion();
  const firma = useRef<PanelFirma>(null);
  const entregaId = useRef(crypto.randomUUID()); // fijo: un doble toque no crea dos entregas
  const [lineas, setLineas] = useState<LineaEntrega[]>(() => lineasIniciales(parada.lineas));
  const [hayFirma, setHayFirma] = useState(false);
  const [sinFirma, setSinFirma] = useState(false);
  const [sinFirmaMotivo, setSinFirmaMotivo] = useState("");
  const [firmante, setFirmante] = useState("");
  const [envasesEntregados, setEnvasesEntregados] = useState(0);
  const [envasesRecogidos, setEnvasesRecogidos] = useState(0);
  const [cobro, setCobro] = useState(false);
  const [importe, setImporte] = useState("");
  const [formaCobro, setFormaCobro] = useState<string | null>(null);
  const [motivo, setMotivo] = useState<string | null>(null);
  const [observaciones, setObservaciones] = useState("");
  const [fotos, setFotos] = useState<{ blob: Blob; url: string }[]>([]);
  const [procesandoFoto, setProcesandoFoto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const entradaFoto = useRef<HTMLInputElement>(null);
  const alCambiarFirma = useCallback((v: boolean) => setHayFirma(v), []);

  async function anadirFotos(ficheros: FileList | null) {
    if (!ficheros?.length) return;
    setProcesandoFoto(true);
    try {
      const nuevas: { blob: Blob; url: string }[] = [];
      for (const f of Array.from(ficheros).slice(0, 3 - fotos.length)) {
        const blob = await comprimirFoto(f);
        nuevas.push({ blob, url: URL.createObjectURL(blob) });
      }
      setFotos((x) => [...x, ...nuevas]);
    } catch {
      setError("No se ha podido procesar la foto.");
    } finally {
      setProcesandoFoto(false);
      if (entradaFoto.current) entradaFoto.current.value = "";
    }
  }

  async function guardar() {
    const cobrado = cobro ? leerImporte(importe) : null;
    const fallo = validarEntrega({
      estado: modo,
      hayFirma: modo === "entregada" && !sinFirma && hayFirma,
      fotos: fotos.length,
      sinFirmaMotivo: sinFirma ? sinFirmaMotivo : null,
      motivo_fallo: motivo === "Otro" ? observaciones.trim() || null : motivo,
      cobrado: cobro ? cobrado : null,
      forma_cobro: formaCobro,
    });
    if (fallo) {
      setError(fallo === "Elige el motivo." && motivo === "Otro" ? "Explica el motivo en las observaciones." : fallo);
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      const blobFirma = modo === "entregada" && !sinFirma ? await firma.current?.exportar() ?? null : null;
      const notas = [sinFirma && modo === "entregada" ? `Sin firma: ${sinFirmaMotivo.trim()}` : null, observaciones.trim() || null].filter(Boolean).join(" · ");
      await guardarEntrega(
        baseReparto(),
        {
          id: entregaId.current,
          parada_id: parada.id,
          ruta_id: rutaId,
          usuario_id: usuarioId,
          estado: modo,
          datos: {
            realizada_at: new Date().toISOString(),
            firmante: modo === "entregada" ? firmante.trim() || null : null,
            lineas: modo === "entregada" ? lineas : [],
            envases_entregados: modo === "entregada" ? envasesEntregados : 0,
            envases_recogidos: envasesRecogidos,
            cobrado: modo === "entregada" ? cobrado : null,
            forma_cobro: modo === "entregada" && cobro ? formaCobro : null,
            motivo_fallo: modo === "fallida" ? (motivo === "Otro" ? observaciones.trim() : motivo) : null,
            observaciones: notas || null,
            lat: pos?.lat ?? null,
            lng: pos?.lng ?? null,
            precision_m: pos?.precision ?? null,
          },
        },
        blobFirma,
        fotos.map((f) => f.blob),
      );
      fotos.forEach((f) => URL.revokeObjectURL(f.url));
      alGuardar();
    } catch {
      setError("No se ha podido guardar en el móvil. Comprueba que queda espacio e inténtalo otra vez.");
      setGuardando(false);
    }
  }

  return (
    <div className="space-y-4 px-4 pb-8">
      <button type="button" onClick={alCancelar} className="inline-flex min-h-11 items-center gap-1 text-sm text-suave">
        <ChevronLeft className="h-5 w-5" aria-hidden /> Volver
      </button>
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-suave">{modo === "entregada" ? "Entrega" : "No se pudo entregar"}</p>
        <h1 className="text-2xl font-bold">{parada.cliente.nombre}</h1>
      </div>

      {modo === "entregada" ? (
        <>
          {lineas.length > 0 && (
            <section className="rounded-2xl border border-borde bg-superficie p-4">
              <p className="mb-2 text-sm font-medium">Lo entregado {esEntregaParcial(lineas) && <span className="text-amber-700 dark:text-amber-300">· entrega parcial</span>}</p>
              <ul className="divide-y divide-borde">
                {lineas.map((l, i) => (
                  <li key={i} className="flex items-center justify-between gap-2 py-2">
                    <span className={cn("min-w-0 flex-1 text-sm", l.entregada < l.pedida && "text-amber-700 dark:text-amber-300")}>
                      {l.descripcion}
                      {l.entregada !== l.pedida && <span className="block text-xs">Pedido: {l.pedida.toLocaleString("es-ES")}</span>}
                    </span>
                    <Contador valor={l.entregada} etiqueta={l.descripcion} alCambiar={(v) => setLineas((x) => cambiarCantidad(x, i, v - x[i].entregada))} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="grid grid-cols-2 gap-3 rounded-2xl border border-borde bg-superficie p-4">
            <div>
              <p className="mb-1 text-sm font-medium">Envases dejados</p>
              <Contador valor={envasesEntregados} alCambiar={setEnvasesEntregados} etiqueta="envases dejados" />
            </div>
            <div>
              <p className="mb-1 text-sm font-medium">Vacíos recogidos</p>
              <Contador valor={envasesRecogidos} alCambiar={setEnvasesRecogidos} etiqueta="envases recogidos" />
            </div>
          </section>

          <section className="rounded-2xl border border-borde bg-superficie p-4">
            <label className="flex items-center gap-3 text-sm font-medium">
              <input type="checkbox" checked={cobro} onChange={(e) => setCobro(e.target.checked)} className="h-5 w-5 accent-[var(--marca)]" /> Ha pagado ahora
            </label>
            {cobro && (
              <div className="mt-3 space-y-2">
                <label className="block text-sm">
                  Importe cobrado (€)
                  <input inputMode="decimal" value={importe} onChange={(e) => setImporte(e.target.value)} placeholder="0,00" className={campo} />
                </label>
                <div className="flex flex-wrap gap-2">
                  {FORMAS_COBRO.map((f) => (
                    <Chip key={f} activo={formaCobro === f} onClick={() => setFormaCobro(f)}>
                      {f}
                    </Chip>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-borde bg-superficie p-4">
            {!sinFirma ? (
              <>
                <p className="mb-2 text-sm font-medium">Firma del cliente</p>
                <Firma ref={firma} alCambiar={alCambiarFirma} />
                <label className="mt-2 block text-sm">
                  Nombre de quien recibe (opcional)
                  <input value={firmante} onChange={(e) => setFirmante(e.target.value)} autoComplete="off" className={campo} />
                </label>
                <button type="button" onClick={() => setSinFirma(true)} className="mt-2 text-sm text-suave underline">
                  El cliente no puede firmar
                </button>
              </>
            ) : (
              <>
                <p className="text-sm font-medium">Entrega sin firma</p>
                <label className="mt-1 block text-sm">
                  ¿Por qué? (obligatorio, y haz una foto de la entrega)
                  <input value={sinFirmaMotivo} onChange={(e) => setSinFirmaMotivo(e.target.value)} placeholder="Cerrado, dejado en el almacén del bar" className={campo} />
                </label>
                <button type="button" onClick={() => setSinFirma(false)} className="mt-2 text-sm text-suave underline">
                  Volver a la firma
                </button>
              </>
            )}
          </section>
        </>
      ) : (
        <section className="rounded-2xl border border-borde bg-superficie p-4">
          <p className="mb-2 text-sm font-medium">¿Qué ha pasado?</p>
          <div className="flex flex-wrap gap-2">
            {MOTIVOS_FALLO.map((m) => (
              <Chip key={m} activo={motivo === m} onClick={() => setMotivo(m)}>
                {m}
              </Chip>
            ))}
          </div>
          <div className="mt-3">
            <p className="mb-1 text-sm font-medium">Vacíos recogidos igualmente</p>
            <Contador valor={envasesRecogidos} alCambiar={setEnvasesRecogidos} etiqueta="envases recogidos" />
          </div>
        </section>
      )}

      <section className="space-y-3 rounded-2xl border border-borde bg-superficie p-4">
        <div className="flex gap-2 overflow-x-auto">
          {fotos.map((f, i) => (
            <div key={f.url} className="relative shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.url} alt="" className="h-24 w-24 rounded-xl object-cover" />
              <button
                type="button"
                onClick={() => {
                  URL.revokeObjectURL(f.url);
                  setFotos((x) => x.filter((_, j) => j !== i));
                }}
                aria-label="Quitar foto"
                className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          {fotos.length < 3 && (
            <button
              type="button"
              onClick={() => entradaFoto.current?.click()}
              disabled={procesandoFoto}
              className="flex h-24 w-24 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-borde text-xs text-suave"
            >
              {procesandoFoto ? <Loader2 className="h-6 w-6 animate-spin" /> : <Camera className="h-6 w-6" />}
              Foto{modo === "entregada" && !sinFirma ? " (opcional)" : ""}
            </button>
          )}
        </div>
        <input ref={entradaFoto} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={(e) => anadirFotos(e.target.files)} />
        <label className="block text-sm">
          Observaciones{modo === "fallida" && motivo === "Otro" ? " (obligatorio)" : " (opcional)"}
          <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} rows={2} className={cn(campo, "py-2")} />
        </label>
      </section>

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700 dark:bg-red-950/50 dark:text-red-300">
          {error}
        </p>
      )}

      <Boton type="button" onClick={guardar} cargando={guardando} variante={modo === "entregada" ? "principal" : "peligro"} className="min-h-14 w-full text-lg">
        {modo === "entregada" ? "Confirmar entrega" : "Registrar: no entregada"}
      </Boton>
      <p className="text-center text-xs text-suave">Se guarda en el móvil al momento y se sube sola en cuanto haya cobertura.</p>
    </div>
  );
}
