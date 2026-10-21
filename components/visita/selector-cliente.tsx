"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { AlertTriangle, MapPin, Plus, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Demo, EtiquetaEstado } from "@/components/app/piezas";
import { Chip } from "@/components/ui/chip";
import { distanciaMetros, normalizarTexto, textoDistancia } from "@/lib/dominio/visita";
import { TEXTO_TIPO_NEGOCIO, TIPOS_NEGOCIO, type TipoNegocio } from "@/lib/dominio/tipos";
import type { Posicion } from "@/lib/navegador";
import { baseLocal, type ClienteLocal } from "@/lib/offline/db";
import { supabaseNavegador } from "@/lib/supabase/navegador";

export interface BorradorCliente {
  nombre_negocio: string;
  tipo: TipoNegocio;
  telefono: string;
  contacto_nombre: string;
}

interface Props {
  seleccionado: ClienteLocal | null;
  onSeleccionar: (c: ClienteLocal | null) => void;
  nuevo: BorradorCliente | null;
  onNuevo: (b: BorradorCliente | null) => void;
  pos: Posicion | null;
}

const campo =
  "w-full rounded-xl border border-borde bg-superficie px-4 py-3 text-base outline-none focus:border-marca focus:ring-2 focus:ring-marca/30";

export function SelectorCliente({ seleccionado, onSeleccionar, nuevo, onNuevo, pos }: Props) {
  const [busqueda, setBusqueda] = useState("");
  const clientes = useLiveQuery(() => baseLocal().clientes.toArray(), [], []);

  const lista = useMemo(() => {
    const q = normalizarTexto(busqueda);
    const conDistancia = clientes.map((c) => ({
      c,
      d: pos && c.lat != null && c.lng != null ? distanciaMetros(pos, { lat: c.lat, lng: c.lng }) : null,
    }));
    if (q) {
      return conDistancia
        .filter(({ c }) => normalizarTexto(`${c.nombre_negocio} ${c.zona ?? ""} ${c.direccion ?? ""}`).includes(q))
        .sort((a, b) => (a.d ?? Infinity) - (b.d ?? Infinity))
        .slice(0, 8);
    }
    // Sin búsqueda: los más cercanos; sin GPS, los visitados más recientemente
    return conDistancia
      .sort((a, b) =>
        pos ? (a.d ?? Infinity) - (b.d ?? Infinity) : (b.c.ultima_visita_at ?? "").localeCompare(a.c.ultima_visita_at ?? ""),
      )
      .slice(0, 6);
  }, [clientes, busqueda, pos]);

  if (seleccionado) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border-2 border-marca bg-superficie p-4">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 font-semibold">
            <span className="truncate">{seleccionado.nombre_negocio}</span>
            {seleccionado.is_seed && <Demo />}
          </p>
          <p className="truncate text-sm text-suave">
            {TEXTO_TIPO_NEGOCIO[seleccionado.tipo]}
            {seleccionado.zona ? ` · ${seleccionado.zona}` : ""}
            {seleccionado.pendiente ? " · Nuevo (sin subir)" : ""}
          </p>
          <div className="mt-1">
            <EtiquetaEstado estado={seleccionado.estado} />
          </div>
        </div>
        <button type="button" onClick={() => onSeleccionar(null)} className="min-h-11 rounded-xl px-3 text-sm font-medium text-marca">
          Cambiar
        </button>
      </div>
    );
  }

  if (nuevo) {
    return <AltaRapida borrador={nuevo} onCambio={onNuevo} onUsarExistente={onSeleccionar} clientes={clientes} />;
  }

  return (
    <div className="space-y-2">
      <label className="relative block">
        <span className="sr-only">Buscar cliente</span>
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-suave" aria-hidden />
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar bar, restaurante…"
          className={`${campo} pl-12`}
          enterKeyHint="search"
        />
      </label>
      {!busqueda && pos && <p className="px-1 text-xs text-suave">Más cercanos a ti</p>}
      <ul className="divide-y divide-borde overflow-hidden rounded-2xl border border-borde bg-superficie">
        {lista.map(({ c, d }) => (
          <li key={c.id}>
            <button type="button" onClick={() => onSeleccionar(c)} className="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left active:bg-fondo">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{c.nombre_negocio}</p>
                <p className="truncate text-xs text-suave">
                  {TEXTO_TIPO_NEGOCIO[c.tipo]}
                  {c.zona ? ` · ${c.zona}` : ""}
                </p>
              </div>
              {d != null && (
                <span className="flex items-center gap-0.5 text-xs text-suave">
                  <MapPin className="h-3.5 w-3.5" aria-hidden />
                  {textoDistancia(d)}
                </span>
              )}
            </button>
          </li>
        ))}
        {lista.length === 0 && <li className="px-4 py-3 text-sm text-suave">{busqueda ? "No hay ninguno con ese nombre." : "Aún no hay clientes en el móvil."}</li>}
      </ul>
      <button
        type="button"
        onClick={() => onNuevo({ nombre_negocio: busqueda.trim(), tipo: "bar", telefono: "", contacto_nombre: "" })}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-marca text-sm font-semibold text-marca"
      >
        <Plus className="h-5 w-5" aria-hidden />
        {busqueda.trim() ? `Crear «${busqueda.trim()}»` : "Cliente nuevo"}
      </button>
    </div>
  );
}

interface Duplicado {
  id: string;
  nombre_negocio: string;
  zona: string | null;
  comercial: string | null;
  es_mio: boolean;
}

function AltaRapida({
  borrador,
  onCambio,
  onUsarExistente,
  clientes,
}: {
  borrador: BorradorCliente;
  onCambio: (b: BorradorCliente | null) => void;
  onUsarExistente: (c: ClienteLocal) => void;
  clientes: ClienteLocal[];
}) {
  const [duplicados, setDuplicados] = useState<Duplicado[]>([]);
  const nombre = borrador.nombre_negocio.trim();

  // Con red se consulta en el servidor (ve los de todos los comerciales); sin red, solo los del móvil
  useEffect(() => {
    if (nombre.length < 3) return;
    const t = setTimeout(async () => {
      const locales = clientes
        .filter((c) => normalizarTexto(c.nombre_negocio).includes(normalizarTexto(nombre)))
        .map((c) => ({ id: c.id, nombre_negocio: c.nombre_negocio, zona: c.zona, comercial: null, es_mio: true }));
      if (!navigator.onLine) return setDuplicados(locales.slice(0, 3));
      const { data } = await supabaseNavegador().rpc("buscar_posibles_duplicados", {
        p_nombre: nombre,
        p_telefono: borrador.telefono || undefined,
      });
      setDuplicados(data ?? locales.slice(0, 3));
    }, 400);
    return () => clearTimeout(t);
  }, [nombre, borrador.telefono, clientes]);

  const set = (cambio: Partial<BorradorCliente>) => onCambio({ ...borrador, ...cambio });
  const visibles = nombre.length < 3 ? [] : duplicados;

  return (
    <div className="space-y-3 rounded-2xl border-2 border-marca bg-superficie p-4">
      <div className="flex items-center justify-between">
        <p className="font-semibold">Cliente nuevo</p>
        <button type="button" onClick={() => onCambio(null)} aria-label="Cancelar cliente nuevo" className="-mr-2 p-2 text-suave">
          <X className="h-5 w-5" />
        </button>
      </div>
      <input
        value={borrador.nombre_negocio}
        onChange={(e) => set({ nombre_negocio: e.target.value })}
        placeholder="Nombre del negocio *"
        aria-label="Nombre del negocio"
        className={campo}
        autoFocus
        autoCapitalize="words"
      />
      {visibles.length > 0 && (
        <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-900/30 dark:text-amber-100">
          <p className="mb-1 flex items-center gap-1.5 font-semibold">
            <AlertTriangle className="h-4 w-4" aria-hidden /> ¿Ya existe?
          </p>
          <ul className="space-y-1">
            {visibles.map((d) => {
              const local = clientes.find((c) => c.id === d.id);
              return (
                <li key={d.id} className="flex items-center justify-between gap-2">
                  <span>
                    {d.nombre_negocio}
                    {d.zona ? ` (${d.zona})` : ""}
                    {!d.es_mio && ` · lo lleva ${d.comercial ?? "otro comercial"}`}
                  </span>
                  {local && (
                    <button type="button" onClick={() => onUsarExistente(local)} className="shrink-0 font-semibold underline">
                      Usar este
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Tipo de negocio">
        {TIPOS_NEGOCIO.map((t) => (
          <Chip key={t} activo={borrador.tipo === t} onClick={() => set({ tipo: t })} role="radio" aria-checked={borrador.tipo === t}>
            {TEXTO_TIPO_NEGOCIO[t]}
          </Chip>
        ))}
      </div>
      <input
        value={borrador.telefono}
        onChange={(e) => set({ telefono: e.target.value })}
        placeholder="Teléfono (opcional)"
        aria-label="Teléfono"
        inputMode="tel"
        type="tel"
        className={campo}
      />
      <input
        value={borrador.contacto_nombre}
        onChange={(e) => set({ contacto_nombre: e.target.value })}
        placeholder="Persona de contacto (opcional)"
        aria-label="Persona de contacto"
        autoCapitalize="words"
        className={campo}
      />
      <p className="text-xs text-suave">Se guarda con tu ubicación actual. El resto de datos, desde la ficha.</p>
    </div>
  );
}
