"use client";

import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Chip } from "@/components/ui/chip";
import type { OfertaMensaje, PlantillaMensaje } from "@/lib/datos/mensajeria";
import { conBaja, rellenarPlantilla } from "@/lib/dominio/plantillas";
import { BotonEnviar } from "./boton-enviar";

interface Cliente {
  id: string;
  nombre_negocio: string;
  contacto_nombre: string | null;
  telefono: string | null;
  email: string | null;
  consiente_whatsapp: boolean;
  consiente_email: boolean;
}

type Canal = "whatsapp" | "email";

export function EnvioIndividual({
  cliente: c,
  comercial,
  plantillas,
  ofertas,
  ofertaInicial,
}: {
  cliente: Cliente;
  comercial: string;
  plantillas: PlantillaMensaje[];
  ofertas: OfertaMensaje[];
  ofertaInicial: string | null;
}) {
  const [canal, setCanal] = useState<Canal>(c.consiente_whatsapp || !c.consiente_email ? "whatsapp" : "email");
  const [ofertaId, setOfertaId] = useState<string | null>(ofertas.some((o) => o.id === ofertaInicial) ? ofertaInicial : null);
  const elegirPlantilla = (cn: Canal, conOferta: boolean) =>
    plantillas.filter((p) => p.canal === cn).find((p) => conOferta === /\{oferta\}/.test(p.cuerpo)) ?? plantillas.find((p) => p.canal === cn) ?? null;
  const [plantillaId, setPlantillaId] = useState<string | null>(elegirPlantilla(canal, !!ofertaId)?.id ?? null);
  const [editado, setEditado] = useState<string | null>(null);

  const plantilla = plantillas.find((p) => p.id === plantillaId) ?? null;
  const oferta = ofertas.find((o) => o.id === ofertaId) ?? null;
  const datos = { contacto: c.contacto_nombre, negocio: c.nombre_negocio, comercial, oferta };
  const generado = plantilla ? conBaja(rellenarPlantilla(plantilla.cuerpo, datos), canal) : conBaja(`Hola ${c.contacto_nombre?.split(" ")[0] ?? ""}, soy ${comercial}.`.replace(" ,", ","), canal);
  const texto = editado ?? generado;
  const asunto = plantilla?.asunto ? rellenarPlantilla(plantilla.asunto, datos) : oferta?.titulo ?? `Novedades para ${c.nombre_negocio}`;

  const consiente = canal === "whatsapp" ? c.consiente_whatsapp : c.consiente_email;
  const destino = canal === "whatsapp" ? c.telefono : c.email;

  return (
    <div className="space-y-4 px-4 pb-8">
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Canal">
        {(["whatsapp", "email"] as Canal[]).map((cn) => (
          <Chip
            key={cn}
            activo={canal === cn}
            role="radio"
            aria-checked={canal === cn}
            onClick={() => {
              setCanal(cn);
              setPlantillaId(elegirPlantilla(cn, !!ofertaId)?.id ?? null);
              setEditado(null);
            }}
            className="justify-center"
          >
            {cn === "whatsapp" ? "WhatsApp" : "Email"}
          </Chip>
        ))}
      </div>

      {ofertas.length > 0 && (
        <label className="block text-sm font-medium">
          Oferta
          <select
            value={ofertaId ?? ""}
            onChange={(e) => {
              const id = e.target.value || null;
              setOfertaId(id);
              setPlantillaId(elegirPlantilla(canal, !!id)?.id ?? plantillaId);
              setEditado(null);
            }}
            className="mt-1 min-h-12 w-full rounded-xl border border-borde bg-superficie px-3"
          >
            <option value="">Sin oferta</option>
            {ofertas.map((o) => (
              <option key={o.id} value={o.id}>
                {o.titulo}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="block text-sm font-medium">
        Plantilla
        <select
          value={plantillaId ?? ""}
          onChange={(e) => {
            setPlantillaId(e.target.value || null);
            setEditado(null);
          }}
          className="mt-1 min-h-12 w-full rounded-xl border border-borde bg-superficie px-3"
        >
          <option value="">Mensaje libre</option>
          {plantillas
            .filter((p) => p.canal === canal)
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
        </select>
      </label>

      {canal === "email" && <p className="text-sm"><span className="text-suave">Asunto:</span> {asunto}</p>}
      <label className="block text-sm font-medium">
        Mensaje (puedes retocarlo)
        <textarea value={texto} onChange={(e) => setEditado(e.target.value)} rows={8} className="mt-1 w-full rounded-xl border border-borde bg-superficie p-3 text-base" />
      </label>

      {!consiente ? (
        <div className="flex gap-2 rounded-2xl border border-amber-400 bg-amber-50 p-4 text-sm dark:bg-amber-950/40">
          <ShieldAlert className="h-5 w-5 shrink-0 text-amber-600" aria-hidden />
          <p>
            {c.nombre_negocio} no ha dado su consentimiento para recibir comunicaciones comerciales por {canal === "whatsapp" ? "WhatsApp" : "email"}. Si te lo ha dado,{" "}
            <Link href={`/clientes/${c.id}`} className="font-semibold underline">
              regístralo en su ficha
            </Link>{" "}
            y vuelve aquí.
          </p>
        </div>
      ) : !destino ? (
        <p className="rounded-2xl border border-borde p-4 text-sm text-suave">
          Falta el {canal === "whatsapp" ? "teléfono" : "email"} del cliente.{" "}
          <Link href={`/clientes/${c.id}/editar`} className="font-semibold text-marca underline">
            Añádelo
          </Link>
          .
        </p>
      ) : (
        <BotonEnviar canal={canal} destino={destino} clienteId={c.id} texto={texto} asunto={asunto} ofertaId={ofertaId} plantillaId={plantillaId} />
      )}
      <p className="text-xs text-suave">Se abre {canal === "whatsapp" ? "WhatsApp" : "tu correo"} con el texto escrito: solo tienes que pulsar enviar. Queda anotado en el historial del cliente.</p>
    </div>
  );
}
