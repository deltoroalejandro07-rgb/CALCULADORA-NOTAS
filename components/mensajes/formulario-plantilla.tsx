"use client";

import { startTransition, useActionState, useRef, useState } from "react";
import { guardarPlantilla } from "@/app/(app)/mensajes/acciones";
import { Boton } from "@/components/ui/boton";
import { AYUDA_VARIABLES, conBaja, rellenarPlantilla, VARIABLES, variablesDesconocidas } from "@/lib/dominio/plantillas";
import { fechaDentroDe } from "@/lib/dominio/visita";

interface Plantilla {
  id: string;
  nombre: string;
  canal: "whatsapp" | "email";
  asunto: string | null;
  cuerpo: string;
  activa: boolean;
}

const campo = "mt-1 min-h-12 w-full rounded-xl border border-borde bg-superficie px-3 outline-none focus:border-marca";

export function FormularioPlantilla({ inicial, comercial }: { inicial?: Plantilla; comercial: string }) {
  const [estado, accion, pendiente] = useActionState<{ error?: string }, FormData>(guardarPlantilla, {});
  const [canal, setCanal] = useState(inicial?.canal ?? "whatsapp");
  const [cuerpo, setCuerpo] = useState(inicial?.cuerpo ?? "Hola {contacto}, soy {comercial}. ");
  const area = useRef<HTMLTextAreaElement>(null);

  function insertar(v: string) {
    const el = area.current;
    const marca = `{${v}}`;
    if (!el) return setCuerpo((c) => c + marca);
    const [a, b] = [el.selectionStart, el.selectionEnd];
    const nuevo = cuerpo.slice(0, a) + marca + cuerpo.slice(b);
    setCuerpo(nuevo);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(a + marca.length, a + marca.length);
    });
  }

  const ejemplo = conBaja(
    rellenarPlantilla(cuerpo, {
      contacto: "Paco Jiménez",
      negocio: "Bar El Rincón",
      comercial,
      oferta: { titulo: "Arranque de barril", fecha_fin: fechaDentroDe(20), productos: ["Cerveza lager barril 30 L", "Vermut de grifo"] },
    }),
    canal,
  );
  const malas = variablesDesconocidas(cuerpo);

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
      <label className="block text-sm font-medium">
        Nombre *
        <input name="nombre" required defaultValue={inicial?.nombre} placeholder="Oferta personalizada" className={campo} />
      </label>
      <label className="block text-sm font-medium">
        Canal
        <select name="canal" value={canal} onChange={(e) => setCanal(e.target.value as "whatsapp" | "email")} className={campo}>
          <option value="whatsapp">WhatsApp</option>
          <option value="email">Email</option>
        </select>
      </label>
      {canal === "email" && (
        <label className="block text-sm font-medium">
          Asunto
          <input name="asunto" defaultValue={inicial?.asunto ?? ""} placeholder="Novedades para {negocio}" className={campo} />
        </label>
      )}
      <div>
        <label className="block text-sm font-medium" htmlFor="cuerpo">
          Mensaje *
        </label>
        <div className="my-2 flex flex-wrap gap-1.5">
          {VARIABLES.filter((v) => v === "contacto" || v === "negocio" || v === "comercial").map((v) => (
            <button key={v} type="button" onClick={() => insertar(v)} title={AYUDA_VARIABLES[v]} className="rounded-lg border border-borde bg-superficie px-2 py-1.5 font-mono text-xs">
              {`{${v}}`}
            </button>
          ))}
        </div>
        <textarea id="cuerpo" ref={area} name="cuerpo" required rows={7} value={cuerpo} onChange={(e) => setCuerpo(e.target.value)} className="w-full rounded-xl border border-borde bg-superficie p-3" />
        {malas.length > 0 && <p className="text-sm text-red-600">No existen: {malas.map((v) => `{${v}}`).join(", ")}</p>}
      </div>
      <div>
        <p className="text-sm font-medium">Así lo verá un cliente</p>
        <p className="mt-1 whitespace-pre-line rounded-2xl bg-[#dcf8c6] p-3 text-sm text-slate-900">{ejemplo}</p>
        <p className="mt-1 text-xs text-suave">El aviso de baja se añade solo si la plantilla no lo incluye (obligatorio por la LSSI).</p>
      </div>
      <label className="flex min-h-11 items-center justify-between">
        <span className="font-medium">Activa</span>
        <input type="checkbox" name="activa" defaultChecked={inicial?.activa ?? true} className="h-6 w-6 accent-[var(--marca)]" />
      </label>
      {estado.error && (
        <p role="alert" className="text-center text-sm text-red-600">
          {estado.error}
        </p>
      )}
      <Boton type="submit" cargando={pendiente} className="w-full">
        {inicial ? "Guardar cambios" : "Crear plantilla"}
      </Boton>
    </form>
  );
}
