"use client";

import { Check, Mail, MessageCircle } from "lucide-react";
import { useState } from "react";
import { registrarEnvio } from "@/app/(app)/mensajes/acciones";
import { cn } from "@/lib/cn";
import { enlaceEmail, enlaceWhatsApp } from "@/lib/dominio/contacto";

interface Props {
  canal: "whatsapp" | "email";
  destino: string;
  clienteId: string;
  texto: string;
  asunto?: string | null;
  ofertaId?: string | null;
  plantillaId?: string | null;
  campanaId?: string | null;
  /** Se llama antes de registrar (p. ej. para crear la campaña la primera vez). */
  antes?: () => Promise<string | null | undefined>;
  onEnviado?: () => void;
  compacto?: boolean;
}

/**
 * Enlace que abre WhatsApp o el correo con el mensaje ya escrito y, a la vez,
 * lo apunta en el historial. Se abre en otra pestaña para que la página siga
 * viva y el registro termine aunque el móvil cambie a WhatsApp.
 */
export function BotonEnviar({ canal, destino, clienteId, texto, asunto, ofertaId, plantillaId, campanaId, antes, onEnviado, compacto }: Props) {
  const [estado, setEstado] = useState<"listo" | "enviado" | "error">("listo");
  const [error, setError] = useState<string | null>(null);
  const href = canal === "whatsapp" ? enlaceWhatsApp(destino, texto) : enlaceEmail(destino, asunto ?? undefined, texto);
  const Icono = estado === "enviado" ? Check : canal === "whatsapp" ? MessageCircle : Mail;

  return (
    <span className="inline-flex flex-col items-stretch">
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        onClick={async () => {
          setError(null);
          const campana = antes ? await antes() : campanaId;
          const r = await registrarEnvio({ cliente_id: clienteId, canal, texto, asunto: asunto ?? null, oferta_id: ofertaId ?? null, plantilla_id: plantillaId ?? null, campana_id: campana ?? null });
          if (r.error) {
            setEstado("error");
            setError(r.error);
          } else {
            setEstado("enviado");
            onEnviado?.();
          }
        }}
        className={cn(
          "inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold",
          compacto ? "min-h-10 px-3 text-sm" : "min-h-12 px-5",
          estado === "enviado" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-100" : canal === "whatsapp" ? "bg-[#25D366] text-white" : "bg-marca text-marca-texto",
        )}
      >
        <Icono className="h-5 w-5" aria-hidden />
        {estado === "enviado" ? "Enviado" : canal === "whatsapp" ? (compacto ? "WhatsApp" : "Abrir WhatsApp") : compacto ? "Email" : "Abrir email"}
      </a>
      {error && <span className="mt-1 text-xs text-red-600">{error}</span>}
    </span>
  );
}
