"use client";

import { CheckCircle2, Download, FileSpreadsheet, Upload } from "lucide-react";
import Link from "next/link";
import Papa from "papaparse";
import { useMemo, useState } from "react";
import { importarLote } from "@/app/(app)/ajustes/importar/acciones";
import { Tarjeta } from "@/components/app/piezas";
import { Boton } from "@/components/ui/boton";
import { cn } from "@/lib/cn";
import { adivinarMapeo, CAMPOS_IMPORTACION, claveDuplicado, convertirFilas, type CampoImportacion, type Mapeo } from "@/lib/dominio/importar";
import { TEXTO_ESTADO, TEXTO_TIPO_NEGOCIO } from "@/lib/dominio/tipos";

const LOTE = 300;

async function leerFichero(f: File): Promise<unknown[][]> {
  if (/\.xlsx$/i.test(f.name)) {
    const { readSheet } = await import("read-excel-file/browser");
    return (await readSheet(f)) as unknown[][];
  }
  if (/\.xls$/i.test(f.name)) throw new Error("El formato .xls antiguo no se puede leer: en Excel, «Guardar como» → .xlsx o CSV.");
  const texto = await f.text();
  const r = Papa.parse<string[]>(texto.replace(/^﻿/, ""), { skipEmptyLines: "greedy" });
  return r.data;
}

function descargarPlantilla() {
  const campos = Object.values(CAMPOS_IMPORTACION).map((c) => c.texto);
  const ejemplo = ["Bar Ejemplo", "Bar", "Paco Pérez", "Dueño", "600 11 22 33", "paco@ejemplo.es", "C/ Mayor 1", "Madrid", "28013", "Centro", "Prospecto", "Distribuciones X", "1.200", "L-V 16-18h", "terraza", "Le interesa el vermut", "Sí", "No"];
  const csv = "﻿" + Papa.unparse({ fields: campos, data: [ejemplo] }, { delimiter: ";" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  a.download = "plantilla-clientes.csv";
  a.click();
}

export function Importador({ comerciales, yo, existentes }: { comerciales: { id: string; nombre: string }[]; yo: string; existentes: { nombre_negocio: string; telefono: string | null }[] }) {
  const [archivo, setArchivo] = useState<string | null>(null);
  const [encabezados, setEncabezados] = useState<string[]>([]);
  const [filas, setFilas] = useState<unknown[][]>([]);
  const [mapeo, setMapeo] = useState<Mapeo>([]);
  const [comercial, setComercial] = useState(yo);
  const [omitirDuplicados, setOmitirDuplicados] = useState(true);
  const [conConsentimientos, setConConsentimientos] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progreso, setProgreso] = useState<{ hechos: number; total: number } | null>(null);
  const [resultado, setResultado] = useState<{ creados: number; consentimientos: number; error?: string } | null>(null);

  const claves = useMemo(() => new Set(existentes.flatMap((c) => claveDuplicado(c))), [existentes]);
  const convertidas = useMemo(() => convertirFilas(filas, mapeo), [filas, mapeo]);
  const analisis = useMemo(() => {
    const vistas = new Set<string>();
    return convertidas.map((r) => {
      if (!r.datos) return { ...r, duplicado: false };
      const k = claveDuplicado(r.datos);
      const duplicado = k.some((x) => claves.has(x) || vistas.has(x));
      k.forEach((x) => vistas.add(x));
      return { ...r, duplicado };
    });
  }, [convertidas, claves]);
  const validas = analisis.filter((r) => r.datos && !(omitirDuplicados && r.duplicado));
  const errores = analisis.filter((r) => r.error);
  const duplicados = analisis.filter((r) => r.duplicado);
  const tieneConsentimiento = mapeo.includes("consiente_whatsapp") || mapeo.includes("consiente_email");

  async function abrir(f: File | undefined) {
    if (!f) return;
    setError(null);
    setResultado(null);
    try {
      const datos = (await leerFichero(f)).filter((fila) => fila.some((c) => String(c ?? "").trim() !== ""));
      if (datos.length < 2) throw new Error("El fichero no tiene filas de datos (la primera fila deben ser los títulos de las columnas).");
      const cab = datos[0].map((c) => String(c ?? ""));
      setArchivo(f.name);
      setEncabezados(cab);
      setFilas(datos.slice(1));
      setMapeo(adivinarMapeo(cab));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se ha podido leer el fichero.");
    }
  }

  async function importar() {
    const lista = validas.map((r) => r.datos!);
    setProgreso({ hechos: 0, total: lista.length });
    let creados = 0;
    let consentimientos = 0;
    for (let i = 0; i < lista.length; i += LOTE) {
      const r = await importarLote({ filas: lista.slice(i, i + LOTE), comercial_id: comercial || null, archivo: archivo ?? "fichero", importar_consentimientos: conConsentimientos });
      creados += r.creados;
      consentimientos += r.consentimientos;
      setProgreso({ hechos: Math.min(i + LOTE, lista.length), total: lista.length });
      if (r.error) {
        setResultado({ creados, consentimientos, error: r.error });
        setProgreso(null);
        return;
      }
    }
    setResultado({ creados, consentimientos });
    setProgreso(null);
    setFilas([]);
    setArchivo(null);
  }

  const select = "min-h-10 w-full rounded-lg border border-borde bg-superficie px-2 text-sm";

  return (
    <div className="space-y-5 px-4 pb-10">
      <Tarjeta>
        <p className="flex items-center gap-1.5 font-semibold">
          <Download className="h-5 w-5 text-marca" aria-hidden /> Exportar clientes
        </p>
        <p className="mt-1 text-sm text-suave">Todos los clientes con contacto, estado, comercial, intereses y consentimientos. Sirve como copia o para pasarlos a un ERP.</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <a href="/api/exportar/clientes?formato=xlsx" className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-marca text-sm font-semibold text-marca-texto">
            <FileSpreadsheet className="h-4 w-4" aria-hidden /> Excel (.xlsx)
          </a>
          <a href="/api/exportar/clientes?formato=csv" className="flex min-h-11 items-center justify-center rounded-xl border border-borde text-sm font-semibold">
            CSV
          </a>
        </div>
      </Tarjeta>

      <Tarjeta>
        <p className="flex items-center gap-1.5 font-semibold">
          <Upload className="h-5 w-5 text-marca" aria-hidden /> Importar clientes
        </p>
        <p className="mt-1 text-sm text-suave">
          Excel (.xlsx) o CSV con una fila de títulos. Las columnas se reconocen solas y puedes corregirlas.{" "}
          <button type="button" onClick={descargarPlantilla} className="font-medium text-marca underline">
            Descargar plantilla
          </button>
        </p>
        <label className="mt-3 flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-marca text-sm font-semibold text-marca">
          <FileSpreadsheet className="h-5 w-5" aria-hidden /> {archivo ?? "Elegir fichero"}
          <input type="file" accept=".xlsx,.csv,.txt,.xls" hidden aria-label="Fichero de clientes" onChange={(e) => abrir(e.target.files?.[0])} />
        </label>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </Tarjeta>

      {resultado && (
        <Tarjeta className={resultado.error ? "border-red-400" : "border-emerald-400"}>
          <p className="flex items-center gap-1.5 font-semibold">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden /> {resultado.creados} clientes importados
            {resultado.consentimientos ? ` · ${resultado.consentimientos} consentimientos` : ""}
          </p>
          {resultado.error && <p className="mt-1 text-sm text-red-600">{resultado.error}</p>}
          <Link href="/clientes" className="mt-2 inline-block text-sm font-medium text-marca underline">
            Ver clientes
          </Link>
        </Tarjeta>
      )}

      {filas.length > 0 && (
        <>
          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-suave">1. Columnas</h2>
            <ul className="space-y-2">
              {encabezados.map((h, i) => (
                <li key={i} className="grid grid-cols-2 items-center gap-2 text-sm">
                  <span className="truncate" title={h}>
                    {h || `(columna ${i + 1})`}
                    <span className="block truncate text-xs text-suave">{String(filas[0]?.[i] ?? "")}</span>
                  </span>
                  <select
                    value={mapeo[i] ?? ""}
                    onChange={(e) => {
                      const v = (e.target.value || null) as CampoImportacion | null;
                      setMapeo((m) => m.map((x, j) => (j === i ? v : x === v ? null : x)));
                    }}
                    aria-label={`Campo para la columna ${h}`}
                    className={cn(select, mapeo[i] && "border-marca")}
                  >
                    <option value="">No importar</option>
                    {(Object.keys(CAMPOS_IMPORTACION) as CampoImportacion[]).map((k) => (
                      <option key={k} value={k}>
                        {CAMPOS_IMPORTACION[k].texto}
                      </option>
                    ))}
                  </select>
                </li>
              ))}
            </ul>
            {!mapeo.includes("nombre_negocio") && <p className="mt-2 text-sm text-red-600">Indica qué columna es el nombre del negocio.</p>}
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-suave">2. Opciones</h2>
            <label className="block text-sm font-medium">
              Asignar a
              <select value={comercial} onChange={(e) => setComercial(e.target.value)} className={`${select} mt-1 min-h-12`}>
                <option value="">Sin asignar</option>
                {comerciales.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center justify-between gap-3 text-sm">
              Saltar los que ya existen ({duplicados.length} posibles duplicados por nombre o teléfono)
              <input type="checkbox" checked={omitirDuplicados} onChange={(e) => setOmitirDuplicados(e.target.checked)} className="h-5 w-5 accent-[var(--marca)]" />
            </label>
            {tieneConsentimiento && (
              <label className="flex items-start justify-between gap-3 rounded-xl border border-amber-400 bg-amber-50 p-3 text-sm dark:bg-amber-950/40">
                <span>
                  Importar también los consentimientos (columnas «Acepta WhatsApp / email»). Márcalo <strong>solo si tienes ese consentimiento documentado</strong> (hoja firmada,
                  formulario…): queda registrado como prueba.
                </span>
                <input type="checkbox" checked={conConsentimientos} onChange={(e) => setConConsentimientos(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--marca)]" />
              </label>
            )}
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-suave">3. Revisión</h2>
            <p className="text-sm">
              <strong>{validas.length}</strong> se importarán · {errores.length} con errores · {omitirDuplicados ? `${duplicados.length} duplicados se saltan` : `${duplicados.length} duplicados se importarán igualmente`}
            </p>
            <div className="mt-2 overflow-x-auto rounded-xl border border-borde">
              <table className="w-full text-xs">
                <thead className="bg-fondo text-left text-suave">
                  <tr>
                    <th className="p-2 font-normal">Fila</th>
                    <th className="p-2 font-normal">Negocio</th>
                    <th className="p-2 font-normal">Tipo / estado</th>
                    <th className="p-2 font-normal">Teléfono</th>
                    <th className="p-2 font-normal">Aviso</th>
                  </tr>
                </thead>
                <tbody>
                  {analisis.slice(0, 50).map((r) => (
                    <tr key={r.fila} className={cn("border-t border-borde", (r.error || (r.duplicado && omitirDuplicados)) && "text-suave line-through")}>
                      <td className="p-2">{r.fila}</td>
                      <td className="p-2">{r.datos?.nombre_negocio ?? "—"}</td>
                      <td className="p-2">{r.datos ? `${TEXTO_TIPO_NEGOCIO[r.datos.tipo]} · ${TEXTO_ESTADO[r.datos.estado]}` : ""}</td>
                      <td className="p-2">{r.datos?.telefono}</td>
                      <td className="p-2 no-underline">{r.error ?? (r.duplicado ? "Ya existe" : r.aviso)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {analisis.length > 50 && <p className="mt-1 text-xs text-suave">Mostrando 50 de {analisis.length} filas.</p>}
          </section>

          <Boton className="w-full" onClick={importar} cargando={!!progreso} disabled={!validas.length || !mapeo.includes("nombre_negocio")}>
            {progreso ? `Importando ${progreso.hechos} de ${progreso.total}…` : `Importar ${validas.length} clientes`}
          </Boton>
        </>
      )}
    </div>
  );
}
