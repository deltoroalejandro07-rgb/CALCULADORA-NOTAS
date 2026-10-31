"use client";

import { Copy, KeyRound } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { generarClavesAvisos } from "@/app/(app)/avisos-acciones";
import { Boton } from "@/components/ui/boton";

function Valor({ nombre, valor }: { nombre: string; valor: string }) {
  const [copiado, setCopiado] = useState<"" | "ok" | "manual">("");
  const caja = useRef<HTMLTextAreaElement>(null);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(valor);
      setCopiado("ok");
      return;
    } catch {}
    // Respaldo para navegadores que no dejan usar el portapapeles: seleccionar y copiar
    const t = caja.current;
    if (t) {
      t.focus();
      t.select();
      t.setSelectionRange(0, valor.length);
      setCopiado(document.execCommand("copy") ? "ok" : "manual");
    }
  }

  return (
    <div className="rounded-lg border border-borde bg-superficie p-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold">
          Key: <code className="select-all">{nombre}</code>
        </p>
        <button type="button" onClick={copiar} className="inline-flex shrink-0 items-center gap-1 rounded-md border border-borde bg-fondo px-2.5 py-1.5 text-xs font-medium hover:bg-borde/40">
          <Copy className="h-3.5 w-3.5" aria-hidden /> {copiado === "ok" ? "✓ Copiado" : "Copiar valor"}
        </button>
      </div>
      <textarea
        ref={caja}
        readOnly
        value={valor}
        rows={valor.length > 60 ? 3 : 1}
        onFocus={(e) => e.currentTarget.select()}
        aria-label={`Valor de ${nombre}`}
        className="mt-1.5 w-full resize-none break-all rounded-md border border-borde bg-fondo/60 px-2 py-1.5 font-mono text-xs outline-none focus:border-marca"
      />
      {copiado === "manual" && <p className="text-xs text-suave">Tu navegador no deja copiar solo: el valor ya está seleccionado, cópialo con Ctrl+C (o Cmd+C en Mac).</p>}
    </div>
  );
}

/** Pasos para activar los avisos: generar las claves aquí y pegarlas en Vercel. */
export function ClavesAvisos({ estado }: { estado: { claves: boolean; secreta: boolean; cron: boolean } }) {
  const [claves, setClaves] = useState<{ publica: string; privada: string; cron: string } | null>(null);
  const [pendiente, empezar] = useTransition();
  return (
    <section className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-sm dark:border-amber-900 dark:bg-amber-950/30">
      <p className="flex items-center gap-1.5 font-semibold">
        <KeyRound className="h-4 w-4" aria-hidden /> Activar los avisos (una sola vez, 5 minutos)
      </p>
      {!estado.secreta && (
        <p className="text-suave">
          Antes: falta <code>SUPABASE_SECRET_KEY</code> en Vercel (la misma que se usa para dar de alta usuarios; mira en Ajustes → Usuarios).
        </p>
      )}
      <ol className="list-decimal space-y-2 pl-5">
        <li>
          Pulsa el botón para crear las claves. Son solo para tu app y <strong>no se guardan aquí</strong>: cópialas directamente a Vercel, no las mandes por chat ni correo.
          <div className="mt-2">
            <Boton type="button" variante="secundario" cargando={pendiente} onClick={() => empezar(async () => setClaves(await generarClavesAvisos()))} className="min-h-10 px-3 text-sm">
              Crear las claves
            </Boton>
          </div>
        </li>
        {claves && (
          <li>
            En Vercel: tu proyecto → <strong>Settings → Environment Variables</strong> → añade {[!estado.claves, !estado.claves, !estado.cron].filter(Boolean).length === 1 ? "esta" : "estas"} (botón <strong>Add</strong>, una a una):
            <div className="mt-2 space-y-2">
              {!estado.claves && <Valor nombre="NEXT_PUBLIC_VAPID_PUBLIC_KEY" valor={claves.publica} />}
              {!estado.claves && <Valor nombre="VAPID_PRIVATE_KEY" valor={claves.privada} />}
              {!estado.cron && <Valor nombre="CRON_SECRET" valor={claves.cron} />}
            </div>
          </li>
        )}
        <li>
          En Vercel: <strong>Deployments</strong> → en el último, <strong>⋯ → Redeploy</strong>. Al terminar, vuelve a esta pantalla: saldrá «Los avisos están configurados».
        </li>
        <li>Cada persona entra en «Más» desde su móvil y pulsa «Activar avisos».</li>
      </ol>
    </section>
  );
}
