"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { euros } from "@/lib/formato";

export const COLOR_SERIE = ["var(--serie-1)", "var(--serie-2)", "var(--serie-3)", "var(--serie-4)", "var(--serie-5)", "var(--serie-6)"];

export function Tarjeta({ titulo, subtitulo, children, className }: { titulo: string; subtitulo?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-xl border border-borde bg-superficie p-4", className)}>
      <h2 className="font-semibold">{titulo}</h2>
      {subtitulo && <p className="text-xs text-suave">{subtitulo}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function Cifra({ valor, etiqueta, detalle }: { valor: string; etiqueta: string; detalle?: string }) {
  return (
    <div className="rounded-xl border border-borde bg-superficie p-4">
      <p className="text-3xl font-bold tabular-nums">{valor}</p>
      <p className="text-sm leading-tight">{etiqueta}</p>
      {detalle && <p className="mt-0.5 text-xs text-suave">{detalle}</p>}
    </div>
  );
}

/** Barras horizontales de una sola serie, con el valor escrito al final de cada barra. */
export function BarrasHorizontales({ datos, color = "var(--serie-1)", formato = (n: number) => String(n) }: { datos: { nombre: string; n: number; color?: string }[]; color?: string; formato?: (n: number) => string }) {
  const max = Math.max(1, ...datos.map((d) => d.n));
  if (!datos.length) return <p className="text-sm text-suave">Sin datos todavía.</p>;
  return (
    <ul className="space-y-2.5">
      {datos.map((d) => (
        <li key={d.nombre} className="grid grid-cols-[minmax(0,9rem)_1fr] items-center gap-3 text-sm" title={`${d.nombre}: ${formato(d.n)}`}>
          <span className="truncate text-suave">{d.nombre}</span>
          <span className="flex items-center gap-2">
            <span className="h-3 rounded-r-[4px]" style={{ width: `${(d.n / max) * 100}%`, minWidth: d.n ? 4 : 0, background: d.color ?? color }} />
            <span className="tabular-nums">{formato(d.n)}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Columnas de una serie (p. ej. clientes nuevos por mes), con tooltip al pasar. */
export function Columnas({ datos, enEuros, color = "var(--serie-1)" }: { datos: { etiqueta: string; n: number }[]; enEuros?: boolean; color?: string }) {
  const formato = (n: number) => (enEuros ? euros(n) : String(n));
  const [activo, setActivo] = useState<number | null>(null);
  const max = Math.max(1, ...datos.map((d) => d.n));
  return (
    <div>
      <div className="relative flex h-36 items-end gap-2 border-b border-borde">
        {datos.map((d, i) => (
          <button
            key={d.etiqueta}
            type="button"
            onMouseEnter={() => setActivo(i)}
            onMouseLeave={() => setActivo(null)}
            onFocus={() => setActivo(i)}
            onBlur={() => setActivo(null)}
            aria-label={`${d.etiqueta}: ${formato(d.n)}`}
            className="flex h-full flex-1 items-end justify-center"
          >
            <span className="w-full max-w-10 rounded-t-[4px]" style={{ height: `${(d.n / max) * 100}%`, minHeight: d.n ? 4 : 0, background: color, opacity: activo === null || activo === i ? 1 : 0.55 }} />
          </button>
        ))}
        {activo !== null && (
          <div className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 rounded-lg border border-borde bg-superficie px-2 py-1 text-xs shadow">
            <strong>{datos[activo].etiqueta}</strong>: {formato(datos[activo].n)}
          </div>
        )}
      </div>
      <div className="mt-1 flex gap-2">
        {datos.map((d) => (
          <span key={d.etiqueta} className="flex-1 text-center text-[11px] text-suave">
            {d.etiqueta}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Columnas apiladas: visitas por semana, un color por comercial. Leyenda, tooltip y tabla. */
export function ColumnasApiladas({ series, filas }: { series: string[]; filas: { etiqueta: string; valores: number[] }[] }) {
  const [activo, setActivo] = useState<number | null>(null);
  const [tabla, setTabla] = useState(false);
  const max = Math.max(1, ...filas.map((f) => f.valores.reduce((a, b) => a + b, 0)));

  return (
    <div>
      <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {series.map((s, i) => (
          <li key={s} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: COLOR_SERIE[i % COLOR_SERIE.length] }} aria-hidden />
            {s}
          </li>
        ))}
      </ul>
      {tabla ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm tabular-nums">
            <thead>
              <tr className="text-left text-xs text-suave">
                <th className="py-1 font-normal">Semana</th>
                {series.map((s) => (
                  <th key={s} className="py-1 text-right font-normal">
                    {s}
                  </th>
                ))}
                <th className="py-1 text-right font-normal">Total</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.etiqueta} className="border-t border-borde">
                  <td className="py-1">{f.etiqueta}</td>
                  {f.valores.map((v, i) => (
                    <td key={i} className="py-1 text-right">
                      {v}
                    </td>
                  ))}
                  <td className="py-1 text-right font-semibold">{f.valores.reduce((a, b) => a + b, 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <div className="relative flex h-44 items-end gap-2 border-b border-borde">
            {filas.map((f, i) => {
              const total = f.valores.reduce((a, b) => a + b, 0);
              return (
                <button
                  key={f.etiqueta}
                  type="button"
                  onMouseEnter={() => setActivo(i)}
                  onMouseLeave={() => setActivo(null)}
                  onFocus={() => setActivo(i)}
                  onBlur={() => setActivo(null)}
                  aria-label={`Semana del ${f.etiqueta}: ${total} visitas`}
                  className="flex h-full flex-1 flex-col-reverse items-center"
                >
                  {f.valores.map((v, j) =>
                    v ? (
                      <span
                        key={j}
                        className={cn("w-full max-w-10", j === f.valores.findLastIndex((x) => x > 0) && "rounded-t-[4px]")}
                        // 2 px de separación entre segmentos con el color de fondo
                        style={{ height: `${(v / max) * 100}%`, background: COLOR_SERIE[j % COLOR_SERIE.length], borderTop: "2px solid var(--superficie)", opacity: activo === null || activo === i ? 1 : 0.55 }}
                      />
                    ) : null,
                  )}
                </button>
              );
            })}
            {activo !== null && (
              <div className="pointer-events-none absolute left-1/2 top-0 z-10 -translate-x-1/2 rounded-lg border border-borde bg-superficie px-3 py-2 text-xs shadow">
                <p className="font-semibold">Semana del {filas[activo].etiqueta}</p>
                {series.map((s, j) => (
                  <p key={s} className="flex items-center gap-1.5 tabular-nums">
                    <span className="h-2 w-2 rounded-sm" style={{ background: COLOR_SERIE[j % COLOR_SERIE.length] }} aria-hidden /> {s}: {filas[activo].valores[j]}
                  </p>
                ))}
              </div>
            )}
          </div>
          <div className="mt-1 flex gap-2">
            {filas.map((f) => (
              <span key={f.etiqueta} className="flex-1 text-center text-[11px] text-suave">
                {f.etiqueta}
              </span>
            ))}
          </div>
        </>
      )}
      <button type="button" onClick={() => setTabla((t) => !t)} className="mt-2 text-xs font-medium text-marca underline">
        {tabla ? "Ver gráfico" : "Ver como tabla"}
      </button>
    </div>
  );
}
