import {
  AlarmClock,
  Briefcase,
  Clock,
  Mail,
  MapPin,
  MessageCircle,
  Navigation,
  Pencil,
  Phone,
  Plus,
  Tag,
  Truck,
  User,
} from "lucide-react";
import Link from "next/link";
import { Demo, EtiquetaEstado, IconoTemperatura, Tarjeta } from "@/components/app/piezas";
import { cn } from "@/lib/cn";
import type { Ficha } from "@/lib/datos/ficha";
import { enlaceComoLlegar, enlaceEmail, enlaceLlamada, enlaceWhatsApp } from "@/lib/dominio/contacto";
import { calcularTemperatura } from "@/lib/dominio/temperatura";
import { TEXTO_TIPO_NEGOCIO } from "@/lib/dominio/tipos";
import { fechaDentroDe } from "@/lib/dominio/visita";
import { euros, fecha } from "@/lib/formato";
import { Comunicaciones } from "./comunicaciones";
import { Historial } from "./historial";

function BotonContacto({ href, icono: Icono, texto, nota }: { href: string | null; icono: typeof Phone; texto: string; nota?: string }) {
  const clase = "flex flex-col items-center justify-center gap-1 rounded-xl border border-borde bg-superficie py-3 text-xs font-medium";
  if (!href)
    return (
      <span className={cn(clase, "opacity-40")} aria-disabled title={nota}>
        <Icono className="h-6 w-6" aria-hidden />
        {texto}
      </span>
    );
  return (
    <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className={cn(clase, "active:scale-95")}>
      <Icono className="h-6 w-6 text-marca" aria-hidden />
      {texto}
    </a>
  );
}

function Dato({ icono: Icono, etiqueta, children }: { icono: typeof Phone; etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-2">
      <Icono className="mt-0.5 h-5 w-5 shrink-0 text-suave" aria-hidden />
      <div className="min-w-0">
        <p className="text-xs text-suave">{etiqueta}</p>
        <div className="break-words">{children}</div>
      </div>
    </div>
  );
}

export function FichaCliente({ ficha, esAdmin }: { ficha: Ficha; esAdmin: boolean }) {
  const { cliente: c, interes } = ficha;
  const t = calcularTemperatura(c);
  const vencida = c.proxima_accion_fecha && c.proxima_accion_fecha < fechaDentroDe(0);
  const llegar = enlaceComoLlegar(c);

  return (
    <div className="space-y-4 px-4 pb-6">
      <header className="pt-1">
        <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold">
          {c.nombre_negocio} {c.is_seed && <Demo />}
        </h1>
        <p className="text-sm text-suave">
          {TEXTO_TIPO_NEGOCIO[c.tipo]}
          {c.zona ? ` · ${c.zona}` : ""}
          {c.comercial ? ` · ${c.comercial.nombre}` : esAdmin ? " · Sin asignar" : ""}
        </p>
        <div className="mt-2 flex items-center gap-3">
          <EtiquetaEstado estado={c.estado} />
          <IconoTemperatura t={t} conTexto />
        </div>
        {c.estado === "perdido" && c.motivo_perdida && <p className="mt-1 text-sm text-red-700 dark:text-red-300">Motivo: {c.motivo_perdida}</p>}
      </header>

      <div className="grid grid-cols-4 gap-2">
        <BotonContacto href={c.telefono ? enlaceLlamada(c.telefono) : null} icono={Phone} texto="Llamar" nota="Sin teléfono" />
        <BotonContacto href={c.telefono ? enlaceWhatsApp(c.telefono) : null} icono={MessageCircle} texto="WhatsApp" nota="Sin teléfono" />
        <BotonContacto href={c.email ? enlaceEmail(c.email) : null} icono={Mail} texto="Email" nota="Sin email" />
        <BotonContacto href={llegar} icono={Navigation} texto="Llegar" nota="Sin dirección" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Link href={`/visita/nueva?cliente=${c.id}`} className="col-span-2 flex min-h-12 items-center justify-center gap-2 rounded-lg bg-marca font-semibold text-marca-texto">
          <Plus className="h-5 w-5" aria-hidden /> Registrar visita
        </Link>
        <Link href={`/mensajes/enviar?cliente=${c.id}`} className="flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-borde bg-superficie text-sm font-medium">
          <MessageCircle className="h-4 w-4" aria-hidden /> Mensaje
        </Link>
        <Link href={`/clientes/${c.id}/editar`} className="flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-borde bg-superficie text-sm font-medium">
          <Pencil className="h-4 w-4" aria-hidden /> Editar
        </Link>
      </div>

      {(c.proxima_accion || c.proxima_accion_fecha) && (
        <Tarjeta className={cn(vencida && "border-red-400 bg-red-50 dark:bg-red-950/40")}>
          <p className={cn("flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide", vencida ? "text-red-700 dark:text-red-300" : "text-marca")}>
            <AlarmClock className="h-4 w-4" aria-hidden /> {vencida ? "Próxima acción vencida" : "Próxima acción"}
          </p>
          <p className="mt-1 font-medium">{c.proxima_accion ?? "Seguimiento"}</p>
          {c.proxima_accion_fecha && <p className="text-sm text-suave">{fecha(c.proxima_accion_fecha)}</p>}
        </Tarjeta>
      )}

      {interes && (
        <section>
          <h2 className="mb-2 text-[13px] font-semibold text-suave">Le interesa</h2>
          <p className="rounded-lg bg-orange-100 px-3 py-2 text-sm text-orange-900 dark:bg-orange-900/40 dark:text-orange-100">
            {interes.texto}
            <span className="block text-xs opacity-70">Apuntado el {fecha(interes.fecha)}</span>
          </p>
        </section>
      )}

      <Comunicaciones clienteId={c.id} whatsapp={c.consiente_whatsapp} email={c.consiente_email} fecha={c.consentimiento_at} />

      <section>
        <h2 className="mb-1 text-[13px] font-semibold text-suave">Datos</h2>
        <Tarjeta className="divide-y divide-borde py-1">
          <Dato icono={User} etiqueta="Contacto">
            {c.contacto_nombre ?? "—"}
            {c.contacto_cargo && <span className="text-suave"> · {c.contacto_cargo}</span>}
          </Dato>
          <Dato icono={Phone} etiqueta="Teléfono y email">
            {c.telefono ?? "—"}
            {c.email && <span className="block text-sm">{c.email}</span>}
          </Dato>
          <Dato icono={MapPin} etiqueta="Dirección">
            {[c.direccion, c.codigo_postal, c.localidad].filter(Boolean).join(", ") || "—"}
          </Dato>
          <Dato icono={Clock} etiqueta="Mejor hora para visitar">
            {c.horario_visita ?? "—"}
          </Dato>
          <Dato icono={Truck} etiqueta="Proveedor actual">
            {c.proveedor_actual ?? "—"}
          </Dato>
          <Dato icono={Briefcase} etiqueta="Volumen estimado">
            {c.volumen_estimado_eur != null ? `${euros(c.volumen_estimado_eur)} / mes` : "—"}
          </Dato>
          {c.etiquetas.length > 0 && (
            <Dato icono={Tag} etiqueta="Etiquetas">
              <div className="flex flex-wrap gap-1">
                {c.etiquetas.map((e) => (
                  <span key={e} className="rounded bg-fondo px-2 py-0.5 text-xs">
                    {e}
                  </span>
                ))}
              </div>
            </Dato>
          )}
          {c.notas && (
            <Dato icono={Pencil} etiqueta="Notas">
              <p className="whitespace-pre-line text-sm">{c.notas}</p>
            </Dato>
          )}
        </Tarjeta>
      </section>

      <Historial ficha={ficha} />

      <p className="text-center text-xs text-suave">
        Alta: {fecha(c.creado_at)} · Última visita: {fecha(c.ultima_visita_at)} · Último pedido: {fecha(c.ultimo_pedido_at)}
      </p>
      <p className="text-center">
        <a href={`/api/rgpd/${c.id}`} className="text-xs text-suave underline">
          Exportar todos los datos de este cliente (RGPD)
        </a>
      </p>
    </div>
  );
}
