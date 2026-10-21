"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { crearPedido } from "@/app/(app)/clientes/acciones";
import { Boton } from "@/components/ui/boton";
import { fechaDentroDe, normalizarTexto } from "@/lib/dominio/visita";
import { euros } from "@/lib/formato";

interface Producto {
  id: string;
  nombre: string;
  formato: string | null;
  precio_tarifa: number;
  destacado: boolean;
}

interface Linea {
  producto_id: string;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
}

export function FormularioPedido({ clienteId, productos }: { clienteId: string; productos: Producto[] }) {
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [fecha, setFecha] = useState(fechaDentroDe(0));
  const [notas, setNotas] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  const sugeridos = useMemo(() => {
    const q = normalizarTexto(busqueda);
    return productos
      .filter((p) => !lineas.some((l) => l.producto_id === p.id))
      .filter((p) => !q || normalizarTexto(`${p.nombre} ${p.formato ?? ""}`).includes(q))
      .sort((a, b) => Number(b.destacado) - Number(a.destacado))
      .slice(0, q ? 20 : 8);
  }, [productos, lineas, busqueda]);

  const total = lineas.reduce((s, l) => s + Math.round(l.cantidad * l.precio_unitario * 100) / 100, 0);
  const cambiar = (i: number, cambio: Partial<Linea>) => setLineas((ls) => ls.map((l, j) => (j === i ? { ...l, ...cambio } : l)));

  function guardar() {
    setError(null);
    iniciar(async () => {
      const r = await crearPedido({ cliente_id: clienteId, fecha, notas, lineas });
      if (r?.error) setError(r.error);
    });
  }

  return (
    <div className="space-y-4 px-4 pb-32">
      {lineas.length > 0 && (
        <ul className="divide-y divide-borde rounded-2xl border border-borde bg-superficie">
          {lineas.map((l, i) => (
            <li key={l.producto_id} className="space-y-2 p-3">
              <div className="flex items-start gap-2">
                <p className="flex-1 text-sm font-medium">{l.descripcion}</p>
                <button type="button" onClick={() => setLineas((ls) => ls.filter((_, j) => j !== i))} aria-label={`Quitar ${l.descripcion}`} className="p-1 text-suave">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center rounded-xl border border-borde">
                  <button type="button" onClick={() => cambiar(i, { cantidad: Math.max(1, l.cantidad - 1) })} aria-label="Menos" className="p-2.5">
                    <Minus className="h-4 w-4" />
                  </button>
                  <input
                    value={l.cantidad}
                    onChange={(e) => cambiar(i, { cantidad: Math.max(0, Number(e.target.value.replace(",", ".")) || 0) })}
                    inputMode="decimal"
                    aria-label="Cantidad"
                    className="w-12 bg-transparent text-center font-semibold tabular-nums outline-none"
                  />
                  <button type="button" onClick={() => cambiar(i, { cantidad: l.cantidad + 1 })} aria-label="Más" className="p-2.5">
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <span className="text-sm text-suave">×</span>
                <label className="flex items-center gap-1 rounded-xl border border-borde px-2">
                  <input
                    defaultValue={l.precio_unitario.toFixed(2).replace(".", ",")}
                    onChange={(e) => cambiar(i, { precio_unitario: Math.max(0, Number(e.target.value.replace(",", ".")) || 0) })}
                    inputMode="decimal"
                    aria-label="Precio unitario"
                    className="w-16 bg-transparent py-2 text-right tabular-nums outline-none"
                  />
                  <span className="text-sm text-suave">€</span>
                </label>
                <span className="ml-auto font-semibold tabular-nums">{euros(l.cantidad * l.precio_unitario)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-suave">Añadir productos</h2>
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar producto"
          aria-label="Buscar producto"
          className="min-h-12 w-full rounded-xl border border-borde bg-superficie px-4 outline-none focus:border-marca"
        />
        <ul className="divide-y divide-borde overflow-hidden rounded-2xl border border-borde bg-superficie">
          {sugeridos.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => {
                  setLineas((ls) => [...ls, { producto_id: p.id, descripcion: `${p.nombre}${p.formato ? ` · ${p.formato}` : ""}`, cantidad: 1, precio_unitario: p.precio_tarifa }]);
                  setBusqueda("");
                }}
                className="flex min-h-12 w-full items-center gap-3 px-4 py-2 text-left active:bg-fondo"
              >
                <span className="flex-1 text-sm">
                  {p.nombre} {p.formato && <span className="text-xs text-suave">{p.formato}</span>}
                </span>
                <span className="text-sm tabular-nums text-suave">{euros(p.precio_tarifa)}</span>
                <Plus className="h-5 w-5 text-marca" aria-hidden />
              </button>
            </li>
          ))}
          {sugeridos.length === 0 && <li className="px-4 py-3 text-sm text-suave">{productos.length ? "No hay más productos con ese nombre." : "El catálogo está vacío: añade productos en Más → Catálogo."}</li>}
        </ul>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm font-medium">
          Fecha
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="mt-1 min-h-12 w-full rounded-xl border border-borde bg-superficie px-3" />
        </label>
        <label className="text-sm font-medium">
          Notas
          <input value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Entrega martes…" className="mt-1 min-h-12 w-full rounded-xl border border-borde bg-superficie px-3" />
        </label>
      </div>

      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t border-borde bg-fondo/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <div>
            <p className="text-xs text-suave">Total (sin IVA)</p>
            <p className="text-xl font-bold tabular-nums">{euros(total)}</p>
          </div>
          <Boton className="flex-1" onClick={guardar} cargando={pendiente} disabled={!lineas.length}>
            Guardar pedido
          </Boton>
        </div>
        {error && <p className="mt-1 text-center text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}
