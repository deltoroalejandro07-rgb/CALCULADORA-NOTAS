import { ChevronRight, FileText, Mail, MessageCircle, Plus, Send } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Cabecera, Cargando } from "@/components/app/piezas";
import { Pestanas } from "@/components/mensajes/pestanas";
import { usuarioActual } from "@/lib/auth";
import { fechaHora } from "@/lib/formato";
import { supabaseServidor } from "@/lib/supabase/servidor";
import { marcarMensaje } from "./acciones";

export const metadata: Metadata = { title: "Mensajes" };

const ESTADO: Record<string, string> = {
  preparado: "Preparado",
  enviado: "Enviado",
  entregado: "Entregado",
  leido: "Leído",
  respondido: "Respondido",
  fallido: "Fallido",
};

export default function PaginaMensajes() {
  return (
    <>
      <Cabecera titulo="Mensajes" subtitulo="WhatsApp y email a tus clientes">
        <Link href="/mensajes/campana" className="flex min-h-11 items-center gap-1 rounded-xl bg-marca px-4 text-sm font-semibold text-marca-texto">
          <Send className="h-4 w-4" aria-hidden /> Campaña
        </Link>
      </Cabecera>
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
  const [{ data: mensajes }, { data: plantillas }] = await Promise.all([
    sb.from("mensajes").select("id, canal, texto, estado, enviado_at, creado_at, cliente:clientes(id, nombre_negocio), comercial:perfiles(nombre)").order("creado_at", { ascending: false }).limit(60),
    sb.from("plantillas").select("id, nombre, canal, cuerpo, activa").order("nombre"),
  ]);

  const historial = (
    <ul className="divide-y divide-borde border-y border-borde bg-superficie lg:mx-4 lg:overflow-hidden lg:rounded-2xl lg:border-x">
      {(mensajes ?? []).map((m) => (
        <li key={m.id} className="px-4 py-3">
          <div className="flex items-start gap-2">
            {m.canal === "whatsapp" ? <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#25D366]" aria-hidden /> : <Mail className="mt-0.5 h-4 w-4 shrink-0 text-marca" aria-hidden />}
            <div className="min-w-0 flex-1">
              <Link href={`/clientes/${m.cliente?.id}`} className="font-medium">
                {m.cliente?.nombre_negocio}
              </Link>
              <p className="text-xs text-suave">
                {fechaHora(m.enviado_at ?? m.creado_at)} · {ESTADO[m.estado]}
                {esAdmin && m.comercial ? ` · ${m.comercial.nombre}` : ""}
              </p>
              <p className="mt-1 line-clamp-2 whitespace-pre-line text-sm text-suave">{m.texto}</p>
            </div>
            {m.estado === "enviado" && (
              <form action={marcarMensaje}>
                <input type="hidden" name="id" value={m.id} />
                <input type="hidden" name="estado" value="respondido" />
                <button className="rounded-lg border border-borde px-2 py-1.5 text-xs font-medium" title="Marcar que ha contestado">
                  Contestó
                </button>
              </form>
            )}
          </div>
        </li>
      ))}
      {!mensajes?.length && <li className="px-4 py-8 text-center text-sm text-suave">Aún no se ha enviado ningún mensaje. Envía uno desde la ficha de un cliente o lanza una campaña.</li>}
    </ul>
  );

  const listaPlantillas = (
    <div className="space-y-2 px-4">
      {esAdmin && (
        <Link href="/mensajes/plantillas/nueva" className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-dashed border-marca text-sm font-semibold text-marca">
          <Plus className="h-5 w-5" aria-hidden /> Nueva plantilla
        </Link>
      )}
      <ul className="divide-y divide-borde overflow-hidden rounded-2xl border border-borde bg-superficie">
        {(plantillas ?? []).map((p) => {
          const contenido = (
            <>
              <FileText className="h-5 w-5 shrink-0 text-suave" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {p.nombre} {!p.activa && <span className="text-xs text-suave">(inactiva)</span>}
                </p>
                <p className="text-xs text-suave">{p.canal === "whatsapp" ? "WhatsApp" : "Email"}</p>
                <p className="line-clamp-2 text-xs text-suave">{p.cuerpo}</p>
              </div>
            </>
          );
          return (
            <li key={p.id}>
              {esAdmin ? (
                <Link href={`/mensajes/plantillas/${p.id}`} className="flex items-center gap-3 px-4 py-3 active:bg-fondo">
                  {contenido}
                  <ChevronRight className="h-5 w-5 shrink-0 text-suave" aria-hidden />
                </Link>
              ) : (
                <div className="flex items-center gap-3 px-4 py-3">{contenido}</div>
              )}
            </li>
          );
        })}
        {!plantillas?.length && <li className="px-4 py-6 text-center text-sm text-suave">No hay plantillas.</li>}
      </ul>
      <p className="text-xs text-suave">Variables: {"{contacto} {negocio} {comercial} {oferta} {productos} {fecha_fin}"}</p>
    </div>
  );

  return <Pestanas pestanas={[{ id: "historial", titulo: "Enviados", contenido: historial }, { id: "plantillas", titulo: "Plantillas", contenido: listaPlantillas }]} />;
}
