"use client";

import { AlertTriangle, CheckCircle2, ChevronDown, FileUp, MapPinOff, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { startTransition, useActionState, useMemo, useRef, useState } from "react";
import { altaManual, anularAlbaran, editarDestino, type EstadoForm } from "@/app/(app)/logistica/acciones-planificar";
import type { RespuestaImportar } from "@/app/api/logistica/albaranes/route";
import { Tarjeta } from "@/components/app/piezas";
import { Boton } from "@/components/ui/boton";
import { cn } from "@/lib/cn";
import { DIAS_SEMANA } from "@/lib/dominio/destinos";
import { textoFranja } from "@/lib/dominio/horario";
import { fecha as formatoFecha } from "@/lib/formato";
import { supabaseNavegador } from "@/lib/supabase/navegador";

const campo = "mt-1 min-h-11 w-full rounded-xl border border-borde bg-superficie px-3 outline-none focus:border-marca";

function enviar(accion: (f: FormData) => void) {
  return (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const datos = new FormData(e.currentTarget);
    startTransition(() => accion(datos));
  };
}

// ---------- Subir PDF ----------

export function SubirAlbaranes() {
  const router = useRouter();
  const entrada = useRef<HTMLInputElement>(null);
  const [estado, setEstado] = useState<{ fase: "listo" | "subiendo" | "leyendo"; n?: number }>({ fase: "listo" });
  const [resultado, setResultado] = useState<RespuestaImportar | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function subir(ficheros: FileList | null) {
    const pdfs = Array.from(ficheros ?? []).filter((f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
    if (!pdfs.length) return;
    setError(null);
    setResultado(null);
    setEstado({ fase: "subiendo", n: pdfs.length });
    try {
      const sb = supabaseNavegador();
      const nombres = new Map<string, string>();
      for (const f of pdfs) {
        const path = `${crypto.randomUUID()}.pdf`;
        const { error: e } = await sb.storage.from("albaranes").upload(path, f, { contentType: "application/pdf" });
        if (e) throw new Error(`No se ha podido subir ${f.name}.`);
        nombres.set(path, f.name);
      }
      setEstado({ fase: "leyendo", n: pdfs.length });
      const r = await fetch("/api/logistica/albaranes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paths: [...nombres.keys()] }) });
      if (!r.ok) throw new Error((await r.json().catch(() => null))?.error ?? "No se han podido leer los PDF.");
      const datos = (await r.json()) as RespuestaImportar;
      datos.archivos.forEach((a) => (a.nombre = nombres.get(a.path)));
      setResultado(datos);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al subir");
    } finally {
      setEstado({ fase: "listo" });
      if (entrada.current) entrada.current.value = "";
    }
  }

  const nuevos = resultado?.archivos.flatMap((a) => a.albaranes).filter((x) => !x.repetido).length ?? 0;
  return (
    <Tarjeta>
      <input ref={entrada} type="file" accept="application/pdf,.pdf" multiple className="hidden" onChange={(e) => subir(e.target.files)} aria-label="Elegir PDF de albaranes" />
      <Boton type="button" className="w-full" cargando={estado.fase !== "listo"} onClick={() => entrada.current?.click()}>
        {estado.fase === "listo" ? (
          <>
            <FileUp className="h-5 w-5" aria-hidden /> Subir PDF de albaranes
          </>
        ) : estado.fase === "subiendo" ? (
          `Subiendo ${estado.n} PDF…`
        ) : (
          `Leyendo ${estado.n} PDF…`
        )}
      </Boton>
      <p className="mt-2 text-xs text-suave">Puedes elegir varios a la vez. Los de Holded se leen al momento; si subes el mismo dos veces, no se duplica.</p>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {resultado && (
        <div className="mt-3 space-y-2 text-sm">
          <p className="font-semibold">
            {nuevos} {nuevos === 1 ? "albarán nuevo" : "albaranes nuevos"}
          </p>
          {resultado.archivos.map((a) => (
            <div key={a.path} className="rounded-xl bg-fondo p-2">
              <p className="truncate text-xs text-suave">{a.nombre}</p>
              {a.error && <p className="text-red-600">{a.error}</p>}
              {a.albaranes.map((x, i) => (
                <div key={i} className="mt-1">
                  <p className="flex items-center gap-1.5 font-medium">
                    {x.avisos.length ? <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" aria-hidden /> : <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />}
                    {x.numero ?? "Sin número"} · {x.cliente}
                  </p>
                  {x.avisos.map((av) => (
                    <p key={av} className="pl-5 text-xs text-amber-700 dark:text-amber-300">
                      {av}
                    </p>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </Tarjeta>
  );
}

// ---------- Alta manual ----------

export function AltaManual({ destinos, zonas }: { destinos: { id: string; nombre: string; direccion: string | null; localidad: string | null }[]; zonas: { id: string; nombre: string }[] }) {
  const [abierta, setAbierta] = useState(false);
  const [busca, setBusca] = useState("");
  const [elegido, setElegido] = useState<string | null>(null);
  const [estado, accion, pendiente] = useActionState<EstadoForm, FormData>(async (p, f) => {
    const r = await altaManual(p, f);
    if (r.ok) {
      setElegido(null);
      setBusca("");
    }
    return r;
  }, {});
  const coincidencias = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return q.length < 2 ? [] : destinos.filter((d) => d.nombre.toLowerCase().includes(q) || d.direccion?.toLowerCase().includes(q)).slice(0, 6);
  }, [busca, destinos]);
  const dest = destinos.find((d) => d.id === elegido);

  if (!abierta) {
    return (
      <Boton type="button" variante="secundario" className="w-full" onClick={() => setAbierta(true)}>
        <Plus className="h-5 w-5" aria-hidden /> Añadir entrega a mano
      </Boton>
    );
  }
  return (
    <Tarjeta>
      <form onSubmit={enviar(accion)} className="space-y-3" key={estado.ok}>
        <p className="font-semibold">Entrega a mano</p>
        {dest ? (
          <div className="flex items-center justify-between rounded-xl bg-fondo p-3 text-sm">
            <input type="hidden" name="destino_id" value={dest.id} />
            <span>
              <span className="font-medium">{dest.nombre}</span>
              <span className="block text-suave">{[dest.direccion, dest.localidad].filter(Boolean).join(", ")}</span>
            </span>
            <button type="button" onClick={() => setElegido(null)} className="text-suave underline">
              Cambiar
            </button>
          </div>
        ) : (
          <>
            <label className="block text-sm font-medium">
              Cliente
              <input name="nombre" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Busca uno conocido o escribe uno nuevo" autoComplete="off" className={campo} />
            </label>
            {coincidencias.length > 0 && (
              <ul className="divide-y divide-borde rounded-xl border border-borde">
                {coincidencias.map((d) => (
                  <li key={d.id}>
                    <button type="button" onClick={() => setElegido(d.id)} className="w-full px-3 py-2 text-left text-sm active:bg-fondo">
                      <span className="font-medium">{d.nombre}</span>
                      <span className="block text-xs text-suave">{[d.direccion, d.localidad].filter(Boolean).join(", ")}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <label className="block text-sm font-medium">
              Dirección de entrega
              <input name="direccion" placeholder="Calle y número" className={campo} />
            </label>
            <div className="grid grid-cols-3 gap-2">
              <label className="col-span-2 block text-sm font-medium">
                Localidad
                <input name="localidad" className={campo} />
              </label>
              <label className="block text-sm font-medium">
                C. P.
                <input name="codigo_postal" inputMode="numeric" className={campo} />
              </label>
            </div>
            <label className="block text-sm font-medium">
              Teléfono (opcional)
              <input name="telefono" inputMode="tel" className={campo} />
            </label>
            <label className="block text-sm font-medium">
              Zona
              <select name="zona" className={campo}>
                <option value="">Sin zona</option>
                {zonas.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.nombre}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
        <label className="block text-sm font-medium">
          Horario prioritario (opcional)
          <input name="horario" placeholder="antes de las 10 · de 8 a 11 · mañanas" className={campo} />
        </label>
        <label className="block text-sm font-medium">
          Productos (uno por línea)
          <textarea name="productos" rows={3} placeholder={"2 Barril 30L\nCaja tónica x3"} className={cn(campo, "py-2")} />
        </label>
        <label className="block text-sm font-medium">
          Nº de albarán (opcional)
          <input name="numero" className={campo} />
        </label>
        {estado.error && <p className="text-sm text-red-600">{estado.error}</p>}
        {estado.ok && <p className="text-sm text-emerald-700 dark:text-emerald-300">✓ {estado.ok}</p>}
        <div className="flex gap-2">
          <Boton type="submit" cargando={pendiente} className="flex-1">
            Añadir entrega
          </Boton>
          <Boton type="button" variante="secundario" onClick={() => setAbierta(false)}>
            Cerrar
          </Boton>
        </div>
      </form>
    </Tarjeta>
  );
}

// ---------- Lista de pendientes ----------

interface Destino {
  id: string;
  nombre: string;
  direccion: string | null;
  localidad: string | null;
  codigo_postal: string | null;
  lat: number | null;
  zona_id: string | null;
  ventana_desde: string | null;
  ventana_hasta: string | null;
  horario_texto: string | null;
  notas_acceso: string | null;
  minutos_descarga: number | null;
}

export interface AlbaranPendiente {
  id: string;
  numero: string | null;
  fecha: string | null;
  estado: "pendiente" | "planificado";
  origen: string;
  notas: string | null;
  lineas: { descripcion: string; cantidad: number }[];
  destino: Destino;
}

function EditarDestino({ d, zonas, alCerrar }: { d: Destino; zonas: { id: string; nombre: string }[]; alCerrar: () => void }) {
  const [estado, accion, pendiente] = useActionState<EstadoForm, FormData>(editarDestino, {});
  return (
    <form onSubmit={enviar(accion)} className="mt-3 space-y-2 rounded-xl bg-fondo p-3 text-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-suave">Datos de {d.nombre} (valen para todas sus entregas)</p>
      <input type="hidden" name="id" value={d.id} />
      <label className="block">
        Dirección
        <input name="direccion" defaultValue={d.direccion ?? ""} className={campo} />
      </label>
      <div className="grid grid-cols-3 gap-2">
        <label className="col-span-2 block">
          Localidad
          <input name="localidad" defaultValue={d.localidad ?? ""} className={campo} />
        </label>
        <label className="block">
          C. P.
          <input name="codigo_postal" defaultValue={d.codigo_postal ?? ""} className={campo} />
        </label>
      </div>
      <label className="block">
        Zona
        <select name="zona_id" defaultValue={d.zona_id ?? ""} className={campo}>
          <option value="">Sin zona</option>
          {zonas.map((z) => (
            <option key={z.id} value={z.id}>
              {z.nombre}
            </option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          Entregar desde
          <input type="time" name="ventana_desde" defaultValue={d.ventana_desde?.slice(0, 5) ?? ""} className={campo} />
        </label>
        <label className="block">
          hasta
          <input type="time" name="ventana_hasta" defaultValue={d.ventana_hasta?.slice(0, 5) ?? ""} className={campo} />
        </label>
      </div>
      <label className="block">
        …o escrito (se interpreta solo)
        <input name="horario_texto" defaultValue={d.horario_texto ?? ""} placeholder="antes de las 10" className={campo} />
      </label>
      <label className="block">
        Cómo llegar / acceso
        <input name="notas_acceso" defaultValue={d.notas_acceso ?? ""} placeholder="Entrar por la calle de atrás" className={campo} />
      </label>
      <label className="block">
        Minutos de descarga aquí (vacío = el general)
        <input type="number" name="minutos_descarga" min={1} max={120} defaultValue={d.minutos_descarga ?? ""} className={campo} />
      </label>
      {estado.error && <p className="text-red-600">{estado.error}</p>}
      {estado.ok && <p className="text-emerald-700 dark:text-emerald-300">✓ {estado.ok}</p>}
      <div className="flex gap-2">
        <Boton type="submit" cargando={pendiente} className="min-h-11 flex-1 text-sm">
          Guardar
        </Boton>
        <Boton type="button" variante="secundario" className="min-h-11 text-sm" onClick={alCerrar}>
          Cerrar
        </Boton>
      </div>
    </form>
  );
}

export function ListaAlbaranes({ albaranes, zonas }: { albaranes: AlbaranPendiente[]; zonas: { id: string; nombre: string; dias: number[] }[] }) {
  const [editando, setEditando] = useState<string | null>(null);
  const [verPlanificados, setVerPlanificados] = useState(false);
  const pendientes = albaranes.filter((a) => a.estado === "pendiente");
  const planificados = albaranes.filter((a) => a.estado === "planificado");
  const grupos = [
    ...zonas.map((z) => ({ id: z.id, titulo: z.nombre, dias: z.dias, lista: pendientes.filter((a) => a.destino.zona_id === z.id) })),
    { id: "sin", titulo: "Sin zona", dias: [] as number[], lista: pendientes.filter((a) => !a.destino.zona_id || !zonas.some((z) => z.id === a.destino.zona_id)) },
  ].filter((g) => g.lista.length);

  const fila = (a: AlbaranPendiente) => {
    const franja = textoFranja(a.destino.ventana_desde, a.destino.ventana_hasta);
    return (
      <li key={a.id} className="p-3">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-medium">
              {a.destino.nombre}
              {a.numero && <span className="font-normal text-suave"> · {a.numero}</span>}
            </p>
            <p className="flex items-center gap-1 text-xs text-suave">
              {a.destino.lat == null && <MapPinOff className="h-3.5 w-3.5 shrink-0 text-red-600" aria-label="Sin ubicación" />}
              {[a.destino.direccion, a.destino.localidad].filter(Boolean).join(", ") || "Sin dirección"}
            </p>
            <p className="text-xs">
              {franja ? <span className="font-medium text-marca">🕘 {franja}</span> : a.destino.horario_texto ? <span className="text-amber-700 dark:text-amber-300">🕘 «{a.destino.horario_texto}» sin interpretar</span> : <span className="text-suave">Sin horario</span>}
              {a.lineas.length > 0 && <span className="text-suave"> · {a.lineas.map((l) => `${l.cantidad} × ${l.descripcion}`).join(", ")}</span>}
            </p>
            {a.destino.lat == null && <p className="text-xs font-medium text-red-600">No está en el mapa: corrige la dirección para que entre en la ruta.</p>}
          </div>
          {a.estado === "pendiente" && (
            <div className="flex shrink-0 gap-1">
              <button type="button" onClick={() => setEditando(editando === a.id ? null : a.id)} aria-label={`Editar ${a.destino.nombre}`} className="rounded-full p-2 text-suave active:bg-fondo">
                <Pencil className="h-5 w-5" />
              </button>
              <form
                action={anularAlbaran}
                onSubmit={(e) => {
                  if (!confirm("¿Quitar este albarán de los pendientes?")) e.preventDefault();
                }}
              >
                <input type="hidden" name="id" value={a.id} />
                <button type="submit" aria-label="Quitar albarán" className="rounded-full p-2 text-red-600 active:bg-fondo">
                  <Trash2 className="h-5 w-5" />
                </button>
              </form>
            </div>
          )}
        </div>
        {editando === a.id && <EditarDestino d={a.destino} zonas={zonas} alCerrar={() => setEditando(null)} />}
      </li>
    );
  };

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-suave">Por repartir ({pendientes.length})</h2>
      {!pendientes.length && <p className="rounded-2xl border border-dashed border-borde p-4 text-center text-sm text-suave">No hay albaranes pendientes. Sube los PDF del día.</p>}
      {grupos.map((g) => (
        <div key={g.id} className="overflow-hidden rounded-2xl border border-borde bg-superficie">
          <p className={cn("flex items-center justify-between px-3 py-2 text-sm font-semibold", g.id === "sin" ? "bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200" : "bg-fondo")}>
            <span>
              {g.titulo} ({g.lista.length})
            </span>
            {g.dias.length > 0 && <span className="text-xs font-normal text-suave">{DIAS_SEMANA.filter((d) => g.dias.includes(d.n)).map((d) => d.corto).join(" ")}</span>}
          </p>
          <ul className="divide-y divide-borde">{g.lista.map(fila)}</ul>
        </div>
      ))}
      {planificados.length > 0 && (
        <div>
          <button type="button" onClick={() => setVerPlanificados((v) => !v)} className="flex items-center gap-1 text-sm text-suave">
            <ChevronDown className={cn("h-4 w-4 transition", verPlanificados && "rotate-180")} aria-hidden /> Ya en una ruta ({planificados.length})
          </button>
          {verPlanificados && <ul className="mt-2 divide-y divide-borde overflow-hidden rounded-2xl border border-borde bg-superficie opacity-75">{planificados.map(fila)}</ul>}
        </div>
      )}
      {(() => {
        const fechas = pendientes.map((a) => a.fecha).filter(Boolean) as string[];
        return fechas.length ? <p className="text-xs text-suave">Albaranes del {formatoFecha(fechas.sort()[0])} al {formatoFecha(fechas.sort().at(-1)!)}.</p> : null;
      })()}
    </section>
  );
}
