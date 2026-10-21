"use client";

import { CheckCircle2, ShieldCheck, XCircle } from "lucide-react";
import { useState, useTransition } from "react";
import { registrarConsentimiento } from "@/app/(app)/clientes/acciones";
import { Tarjeta } from "@/components/app/piezas";
import { Boton } from "@/components/ui/boton";
import { fecha } from "@/lib/formato";

const ORIGENES = [
  ["verbal_visita", "De palabra en la visita"],
  ["formulario_papel", "Hoja firmada"],
  ["whatsapp", "Por WhatsApp"],
  ["email", "Por email"],
  ["web", "Formulario web"],
] as const;

interface Props {
  clienteId: string;
  whatsapp: boolean;
  email: boolean;
  fecha: string | null;
}

export function Comunicaciones({ clienteId, whatsapp, email, fecha: fechaConsentimiento }: Props) {
  const [editando, setEditando] = useState<{ canal: "whatsapp" | "email"; otorgar: boolean } | null>(null);
  const [pendiente, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const fila = (canal: "whatsapp" | "email", texto: string, activo: boolean) => (
    <div className="flex items-center gap-2 py-2">
      {activo ? <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden /> : <XCircle className="h-5 w-5 text-suave" aria-hidden />}
      <span className="flex-1 text-sm">
        {texto}: <strong>{activo ? "acepta ofertas" : "sin consentimiento"}</strong>
      </span>
      <button type="button" onClick={() => setEditando({ canal, otorgar: !activo })} className="min-h-10 px-2 text-sm font-medium text-marca underline">
        {activo ? "Registrar baja" : "Registrar"}
      </button>
    </div>
  );

  return (
    <section>
      <h2 className="mb-1 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-suave">
        <ShieldCheck className="h-4 w-4" aria-hidden /> Comunicaciones comerciales
      </h2>
      <Tarjeta className="py-1">
        {fila("whatsapp", "WhatsApp", whatsapp)}
        <div className="border-t border-borde" />
        {fila("email", "Email", email)}
        {fechaConsentimiento && <p className="pb-2 text-xs text-suave">Último cambio: {fecha(fechaConsentimiento)}</p>}

        {editando && (
          <form
            action={(form) => {
              setError(null);
              iniciar(async () => {
                try {
                  await registrarConsentimiento(form);
                  setEditando(null);
                } catch {
                  setError("No se ha podido guardar. ¿Hay conexión?");
                }
              });
            }}
            className="mb-2 space-y-2 rounded-xl bg-fondo p-3"
          >
            <input type="hidden" name="cliente_id" value={clienteId} />
            <input type="hidden" name="canal" value={editando.canal} />
            <input type="hidden" name="otorgado" value={editando.otorgar ? "si" : "no"} />
            <p className="text-sm font-semibold">
              {editando.otorgar ? "Registrar consentimiento" : "Registrar baja"} por {editando.canal === "whatsapp" ? "WhatsApp" : "email"}
            </p>
            <label className="block text-sm">
              ¿Cómo lo ha comunicado?
              <select name="origen" defaultValue={editando.otorgar ? "verbal_visita" : editando.canal} className="mt-1 min-h-11 w-full rounded-xl border border-borde bg-superficie px-3">
                {ORIGENES.map(([v, t]) => (
                  <option key={v} value={v}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <input
              name="evidencia"
              placeholder={editando.otorgar ? "Prueba (opcional): «firmó la hoja de alta»" : "Detalle (opcional): «respondió BAJA»"}
              className="min-h-11 w-full rounded-xl border border-borde bg-superficie px-3 text-sm"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2">
              <Boton type="submit" cargando={pendiente} className="flex-1" variante={editando.otorgar ? "principal" : "peligro"}>
                Guardar
              </Boton>
              <Boton type="button" variante="secundario" onClick={() => setEditando(null)}>
                Cancelar
              </Boton>
            </div>
            <p className="text-xs text-suave">Queda registrado con fecha, usuario y forma, y no se puede modificar después (RGPD).</p>
          </form>
        )}
      </Tarjeta>
    </section>
  );
}
