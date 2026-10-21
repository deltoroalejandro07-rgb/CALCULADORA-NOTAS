"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { Heart, Star } from "lucide-react";
import { useMemo, useState } from "react";
import { Chip } from "@/components/ui/chip";
import { normalizarTexto, siguienteMarca, type MarcaProducto } from "@/lib/dominio/visita";
import { CATEGORIAS_PRODUCTO } from "@/lib/dominio/tipos";
import { baseLocal } from "@/lib/offline/db";

interface Props {
  marcas: Record<string, MarcaProducto>;
  onCambio: (marcas: Record<string, MarcaProducto>) => void;
}

const VISIBLES = 10;

export function SelectorProductos({ marcas, onCambio }: Props) {
  const productos = useLiveQuery(() => baseLocal().productos.toArray(), [], []);
  const [busqueda, setBusqueda] = useState("");
  const [todos, setTodos] = useState(false);

  const ordenados = useMemo(() => {
    const q = normalizarTexto(busqueda);
    return productos
      .filter((p) => !q || normalizarTexto(`${p.nombre} ${p.formato ?? ""} ${p.categoria}`).includes(q))
      .sort(
        (a, b) =>
          Number(!!marcas[b.id]) - Number(!!marcas[a.id]) ||
          Number(b.destacado) - Number(a.destacado) ||
          CATEGORIAS_PRODUCTO.indexOf(a.categoria) - CATEGORIAS_PRODUCTO.indexOf(b.categoria) ||
          a.nombre.localeCompare(b.nombre, "es"),
      );
  }, [productos, busqueda, marcas]);

  const mostrados = todos || busqueda ? ordenados : ordenados.slice(0, VISIBLES);

  function tocar(id: string) {
    const siguiente = { ...marcas };
    const m = siguienteMarca(marcas[id]);
    if (m) siguiente[id] = m;
    else delete siguiente[id];
    onCambio(siguiente);
  }

  return (
    <div className="space-y-2">
      <input
        type="search"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Filtrar productos"
        aria-label="Filtrar productos"
        className="w-full rounded-xl border border-borde bg-superficie px-4 py-2.5 text-sm outline-none focus:border-marca"
      />
      <div className="flex flex-wrap gap-2">
        {mostrados.map((p) => {
          const m = marcas[p.id];
          return (
            <Chip
              key={p.id}
              activo={!!m}
              tono={m === "interes" ? "interes" : "marca"}
              onClick={() => tocar(p.id)}
              aria-label={`${p.nombre}${p.formato ? ` ${p.formato}` : ""}: ${m === "interes" ? "le interesa" : m === "presentado" ? "presentado" : "sin marcar"}`}
              className="text-left"
            >
              {m === "interes" ? <Heart className="h-4 w-4 fill-current" aria-hidden /> : p.destacado && !m ? <Star className="h-3.5 w-3.5 text-amber-500" aria-hidden /> : null}
              <span>
                {p.nombre}
                {p.formato && <span className="ml-1 text-xs opacity-70">{p.formato}</span>}
              </span>
            </Chip>
          );
        })}
      </div>
      {!busqueda && !todos && ordenados.length > VISIBLES && (
        <button type="button" onClick={() => setTodos(true)} className="min-h-11 text-sm font-medium text-marca">
          Ver los {ordenados.length} productos
        </button>
      )}
      <p className="text-xs text-suave">
        Un toque: <strong>presentado</strong> · dos toques: <strong className="text-orange-600 dark:text-orange-400">le interesa</strong> · tres: quitar
      </p>
    </div>
  );
}
