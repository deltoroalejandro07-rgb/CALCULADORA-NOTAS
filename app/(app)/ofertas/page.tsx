import { ChevronLeft, Plus, Send, Tag, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Cabecera, Cargando } from "@/components/app/piezas";
import { cn } from "@/lib/cn";
import { usuarioActual } from "@/lib/auth";
import { clientesParaSegmentar } from "@/lib/datos/segmento";
import { ofertaEncaja } from "@/lib/dominio/segmentos";
import { TEXTO_ESTADO, TEXTO_TIPO_NEGOCIO } from "@/lib/dominio/tipos";
import { fechaDentroDe } from "@/lib/dominio/visita";
import { fecha } from "@/lib/formato";
import { supabaseServidor } from "@/lib/supabase/servidor";

export const metadata: Metadata = { title: "Ofertas" };

export default function PaginaOfertas() {
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
  // RLS: el comercial solo ve las vigentes y activas
  const [{ data: ofertas }, clientes] = await Promise.all([
    sb.from("ofertas").select("*, oferta_productos(productos(nombre))").order("fecha_fin", { ascending: false }),
    clientesParaSegmentar(),
  ]);
  const hoy = fechaDentroDe(0);

  return (
    <>
      <Cabecera titulo="Ofertas" subtitulo={esAdmin ? "Todas las ofertas" : "Ofertas vigentes"}>
        {esAdmin && (
          <Link href="/ofertas/nueva" className="flex min-h-11 items-center gap-1 rounded-xl bg-marca px-4 text-sm font-semibold text-marca-texto">
            <Plus className="h-5 w-5" aria-hidden /> Oferta
          </Link>
        )}
      </Cabecera>
      <ul className="space-y-3 px-4 pb-6">
        {(ofertas ?? []).map((o) => {
          const vigente = o.activa && hoy >= o.fecha_inicio && hoy <= o.fecha_fin;
          const encajan = clientes.filter((c) => ofertaEncaja(o, c, hoy));
          const conWhatsapp = encajan.filter((c) => c.consiente_whatsapp).length;
          const segmento = [
            o.segmento_tipos.map((t) => TEXTO_TIPO_NEGOCIO[t]).join(", "),
            o.segmento_zonas.join(", "),
            o.segmento_estados.map((e) => TEXTO_ESTADO[e]).join(", "),
            o.segmento_productos.length ? "interesados en sus productos" : "",
          ].filter(Boolean);
          return (
            <li key={o.id} className={cn("rounded-2xl border border-borde bg-superficie p-4", !vigente && "opacity-60")}>
              <div className="flex items-start gap-3">
                <Tag className="mt-0.5 h-5 w-5 shrink-0 text-marca" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{o.titulo}</p>
                  {o.condicion && <p className="text-sm font-medium text-marca">{o.condicion}</p>}
                  {o.descripcion && <p className="mt-1 text-sm text-suave">{o.descripcion}</p>}
                  <p className="mt-1 text-xs text-suave">
                    {fecha(o.fecha_inicio)} – {fecha(o.fecha_fin)}
                    {!vigente && (o.activa ? (hoy < o.fecha_inicio ? " · Aún no empieza" : " · Caducada") : " · Desactivada")}
                  </p>
                  {o.oferta_productos.length > 0 && <p className="text-xs text-suave">Productos: {o.oferta_productos.map((p) => p.productos?.nombre).join(", ")}</p>}
                  <p className="text-xs text-suave">Para: {segmento.length ? segmento.join(" · ") : "todos los clientes"}</p>
                  <p className="mt-2 flex items-center gap-1 text-sm">
                    <Users className="h-4 w-4 text-suave" aria-hidden />
                    <strong>{encajan.length}</strong> {esAdmin ? "" : "de tus "}clientes encajan · {conWhatsapp} con WhatsApp autorizado
                  </p>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                {vigente && encajan.length > 0 && (
                  <Link href={`/mensajes/campana?oferta=${o.id}`} className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-marca text-sm font-semibold text-marca-texto">
                    <Send className="h-4 w-4" aria-hidden /> Enviar a sus clientes
                  </Link>
                )}
                {esAdmin && (
                  <Link href={`/ofertas/${o.id}`} className="flex min-h-11 items-center justify-center rounded-xl border border-borde px-4 text-sm font-medium">
                    Editar
                  </Link>
                )}
              </div>
            </li>
          );
        })}
        {!ofertas?.length && <li className="text-sm text-suave">No hay ofertas {esAdmin ? "todavía." : "vigentes ahora mismo."}</li>}
      </ul>
    </>
  );
}
