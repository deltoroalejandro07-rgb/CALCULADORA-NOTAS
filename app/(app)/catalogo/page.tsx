import { ChevronLeft, ChevronRight, Heart, Plus, Star } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Cabecera, Cargando } from "@/components/app/piezas";
import { usuarioActual } from "@/lib/auth";
import { urlImagenProducto } from "@/lib/datos/segmento";
import { CATEGORIAS_PRODUCTO, TEXTO_CATEGORIA } from "@/lib/dominio/tipos";
import { euros } from "@/lib/formato";
import { supabaseServidor } from "@/lib/supabase/servidor";

export const metadata: Metadata = { title: "Catálogo" };

export default function PaginaCatalogo() {
  return (
    <>
      <Link href="/mas" className="inline-flex min-h-11 items-center gap-1 px-3 pt-3 text-sm text-suave">
        <ChevronLeft className="h-5 w-5" aria-hidden /> Más
      </Link>
      <Suspense fallback={<Cargando />}>
        <Contenido />
      </Suspense>
    </>
  );
}

async function Contenido() {
  const usuario = await usuarioActual();
  const esAdmin = usuario.rol === "admin";
  const sb = await supabaseServidor();
  const [{ data: productos }, { data: intereses }] = await Promise.all([
    sb.from("productos").select("*").order("nombre"),
    sb.from("cliente_productos_interes").select("producto_id"),
  ]);
  const interesados = new Map<string, number>();
  intereses?.forEach((i) => interesados.set(i.producto_id, (interesados.get(i.producto_id) ?? 0) + 1));
  const visibles = (productos ?? []).filter((p) => esAdmin || p.activo);

  return (
    <>
      <Cabecera titulo="Catálogo" subtitulo={`${visibles.length} productos · ♥ = clientes ${esAdmin ? "" : "tuyos "}interesados`}>
        {esAdmin && (
          <Link href="/catalogo/nuevo" className="flex min-h-11 items-center gap-1 rounded-xl bg-marca px-4 text-sm font-semibold text-marca-texto">
            <Plus className="h-5 w-5" aria-hidden /> Producto
          </Link>
        )}
      </Cabecera>
      <div className="space-y-5 pb-6">
        {CATEGORIAS_PRODUCTO.map((cat) => {
          const deCat = visibles.filter((p) => p.categoria === cat).sort((a, b) => Number(b.destacado) - Number(a.destacado));
          if (!deCat.length) return null;
          return (
            <section key={cat}>
              <h2 className="mb-1 px-4 text-sm font-semibold uppercase tracking-wide text-suave">{TEXTO_CATEGORIA[cat]}</h2>
              <ul className="divide-y divide-borde border-y border-borde bg-superficie">
                {deCat.map((p) => {
                  const img = urlImagenProducto(p.imagen_path);
                  const fila = (
                    <>
                      {img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={img} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" loading="lazy" />
                      ) : (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-fondo text-lg font-bold text-suave">{p.nombre[0]}</div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1.5 font-medium">
                          {p.destacado && <Star className="h-4 w-4 shrink-0 fill-amber-400 text-amber-500" aria-label="Destacado" />}
                          <span className="truncate">{p.nombre}</span>
                          {!p.activo && <span className="rounded bg-fondo px-1.5 text-[10px] uppercase text-suave">Inactivo</span>}
                        </p>
                        <p className="truncate text-xs text-suave">
                          {p.formato}
                          {p.referencia ? ` · Ref. ${p.referencia}` : ""}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold tabular-nums">{euros(p.precio_tarifa)}</p>
                        <p className="flex items-center justify-end gap-0.5 text-xs text-orange-600 dark:text-orange-400" title="Clientes interesados">
                          <Heart className="h-3.5 w-3.5" aria-hidden /> {interesados.get(p.id) ?? 0}
                        </p>
                      </div>
                    </>
                  );
                  return (
                    <li key={p.id}>
                      {esAdmin ? (
                        <Link href={`/catalogo/${p.id}`} className="flex items-center gap-3 px-4 py-2.5 active:bg-fondo">
                          {fila}
                          <ChevronRight className="h-5 w-5 shrink-0 text-suave" aria-hidden />
                        </Link>
                      ) : (
                        <div className="flex items-center gap-3 px-4 py-2.5">{fila}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
        {!visibles.length && <p className="px-4 text-sm text-suave">El catálogo está vacío.{esAdmin ? " Añade el primer producto." : ""}</p>}
        <p className="px-4 text-xs text-suave">Precios de tarifa sin IVA.</p>
      </div>
    </>
  );
}
