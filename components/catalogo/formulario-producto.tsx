"use client";

import { ImagePlus, Loader2 } from "lucide-react";
import { startTransition, useActionState, useState } from "react";
import { guardarProducto, type EstadoForm } from "@/app/(app)/catalogo/acciones";
import { Boton } from "@/components/ui/boton";
import { CATEGORIAS_PRODUCTO, TEXTO_CATEGORIA, type CategoriaProducto } from "@/lib/dominio/tipos";
import { comprimirFoto } from "@/lib/navegador";
import { supabaseNavegador } from "@/lib/supabase/navegador";

interface Producto {
  id: string;
  nombre: string;
  referencia: string | null;
  categoria: CategoriaProducto;
  formato: string | null;
  precio_tarifa: number;
  destacado: boolean;
  activo: boolean;
  imagen_path: string | null;
}

const campo = "mt-1 min-h-12 w-full rounded-xl border border-borde bg-superficie px-3 outline-none focus:border-marca";

export function FormularioProducto({ inicial, urlImagen }: { inicial?: Producto; urlImagen?: string | null }) {
  const [estado, accion, pendiente] = useActionState<EstadoForm, FormData>(guardarProducto, {});
  const [imagen, setImagen] = useState({ path: inicial?.imagen_path ?? "", url: urlImagen ?? null });
  const [subiendo, setSubiendo] = useState(false);
  const [errorImagen, setErrorImagen] = useState<string | null>(null);

  async function subir(fichero: File | undefined) {
    if (!fichero) return;
    setSubiendo(true);
    setErrorImagen(null);
    try {
      const blob = await comprimirFoto(fichero, 800, 0.85);
      const path = `${crypto.randomUUID()}.jpg`;
      const { error } = await supabaseNavegador().storage.from("productos").upload(path, blob, { contentType: "image/jpeg" });
      if (error) throw error;
      setImagen({ path, url: URL.createObjectURL(blob) });
    } catch {
      setErrorImagen("No se ha podido subir la imagen.");
    } finally {
      setSubiendo(false);
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        startTransition(() => accion(f));
      }}
      className="space-y-4 px-4 pb-8"
    >
      {inicial && <input type="hidden" name="id" value={inicial.id} />}
      <input type="hidden" name="imagen_path" value={imagen.path} />

      <label className="flex cursor-pointer items-center gap-4 rounded-2xl border border-dashed border-borde bg-superficie p-3">
        {imagen.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imagen.url} alt="" className="h-20 w-20 rounded-xl object-cover" />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-fondo text-suave">
            {subiendo ? <Loader2 className="h-7 w-7 animate-spin" /> : <ImagePlus className="h-7 w-7" />}
          </div>
        )}
        <span className="text-sm text-suave">{imagen.url ? "Cambiar imagen" : "Añadir imagen (opcional)"}</span>
        <input type="file" accept="image/*" hidden onChange={(e) => subir(e.target.files?.[0])} />
      </label>
      {errorImagen && <p className="text-sm text-red-600">{errorImagen}</p>}

      <label className="block text-sm font-medium">
        Nombre *
        <input name="nombre" required defaultValue={inicial?.nombre} className={campo} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-medium">
          Categoría
          <select name="categoria" defaultValue={inicial?.categoria ?? "cerveza"} className={campo}>
            {CATEGORIAS_PRODUCTO.map((c) => (
              <option key={c} value={c}>
                {TEXTO_CATEGORIA[c]}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium">
          Referencia
          <input name="referencia" defaultValue={inicial?.referencia ?? ""} className={campo} />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-medium">
          Formato
          <input name="formato" defaultValue={inicial?.formato ?? ""} placeholder="Caja 24 × 33 cl" className={campo} />
        </label>
        <label className="block text-sm font-medium">
          Precio tarifa (€, sin IVA) *
          <input name="precio_tarifa" required inputMode="decimal" defaultValue={inicial ? String(inicial.precio_tarifa).replace(".", ",") : ""} className={campo} />
        </label>
      </div>
      <div className="space-y-2 rounded-2xl border border-borde bg-superficie p-4">
        <label className="flex min-h-11 items-center justify-between gap-3">
          <span>
            <span className="font-medium">Destacado</span>
            <span className="block text-xs text-suave">Sale primero al registrar visitas y pedidos</span>
          </span>
          <input type="checkbox" name="destacado" defaultChecked={inicial?.destacado ?? false} className="h-6 w-6 accent-[var(--marca)]" />
        </label>
        <label className="flex min-h-11 items-center justify-between gap-3">
          <span>
            <span className="font-medium">Activo</span>
            <span className="block text-xs text-suave">Si lo desactivas deja de ofrecerse, pero se conserva en el historial</span>
          </span>
          <input type="checkbox" name="activo" defaultChecked={inicial?.activo ?? true} className="h-6 w-6 accent-[var(--marca)]" />
        </label>
      </div>
      {estado.error && (
        <p role="alert" className="text-center text-sm text-red-600">
          {estado.error}
        </p>
      )}
      <Boton type="submit" cargando={pendiente} disabled={subiendo} className="w-full">
        {inicial ? "Guardar cambios" : "Crear producto"}
      </Boton>
    </form>
  );
}
