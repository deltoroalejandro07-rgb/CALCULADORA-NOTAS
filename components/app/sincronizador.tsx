"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { AlertTriangle, CloudOff, CloudUpload, Loader2 } from "lucide-react";
import { useOffline } from "next/offline";
import { useEffect, useState } from "react";
import { useEnLinea } from "@/lib/navegador";
import { baseLocal } from "@/lib/offline/db";
import { refrescarCopiaLocal, sincronizar } from "@/lib/offline/sincronizar";
import { supabaseNavegador } from "@/lib/supabase/navegador";

const EVENTO = "crm:sincronizar";

/** Pide una sincronización desde cualquier pantalla (p. ej. tras guardar una visita). */
export function pedirSincronizacion() {
  window.dispatchEvent(new Event(EVENTO));
}

async function ejecutar(setSubiendo: (v: boolean) => void) {
  if (!navigator.onLine) return;
  const sb = supabaseNavegador();
  const { data } = await sb.auth.getSession(); // local, funciona sin red
  const id = data.session?.user.id;
  if (!id) return;
  const db = baseLocal();
  setSubiendo(true);
  try {
    const r = await sincronizar(sb, db, id);
    if (!r.sinConexion) await refrescarCopiaLocal(sb, db);
  } catch {
    // Sin red a mitad: se reintentará en el siguiente evento
  } finally {
    setSubiendo(false);
  }
}

export function Sincronizador() {
  const enLinea = useEnLinea();
  const offline = useOffline();
  const [subiendo, setSubiendo] = useState(false);
  const cola = useLiveQuery(() => baseLocal().cola.toArray(), [], []);
  // Se cuentan visitas: un cliente nuevo viaja con su visita
  const pendientes = cola.filter((o) => o.tipo === "visita").length || cola.length;
  const conError = cola.filter((o) => o.error).length;
  const visitas = (n: number) => `${n} visita${n === 1 ? "" : "s"}`;

  useEffect(() => {
    const lanzar = () => void ejecutar(setSubiendo);
    const alVolver = () => document.visibilityState === "visible" && lanzar();
    lanzar();
    window.addEventListener(EVENTO, lanzar);
    window.addEventListener("online", lanzar);
    document.addEventListener("visibilitychange", alVolver);
    const intervalo = setInterval(lanzar, 120_000);
    return () => {
      window.removeEventListener(EVENTO, lanzar);
      window.removeEventListener("online", lanzar);
      document.removeEventListener("visibilitychange", alVolver);
      clearInterval(intervalo);
    };
  }, []);

  // Service worker: permite abrir "Nueva visita" sin cobertura
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js")
      .then(() => navigator.serviceWorker.ready)
      .then((r) => r.active?.postMessage("cachear-offline"))
      .catch(() => {});
  }, []);

  const sinRed = !enLinea || offline;
  if (!sinRed && !pendientes && !subiendo) return null;

  let icono = <CloudUpload className="h-4 w-4" aria-hidden />;
  let texto = `${visitas(pendientes)} sin subir`;
  let clase = "bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-100";
  if (conError) {
    icono = <AlertTriangle className="h-4 w-4" aria-hidden />;
    texto = `${conError} no se ${conError === 1 ? "ha" : "han"} podido subir`;
    clase = "bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-100";
  } else if (sinRed) {
    icono = <CloudOff className="h-4 w-4" aria-hidden />;
    texto = pendientes ? `Sin cobertura · ${visitas(pendientes)} en el móvil` : "Sin cobertura";
    clase = "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100";
  } else if (subiendo) {
    icono = <Loader2 className="h-4 w-4 animate-spin" aria-hidden />;
    texto = pendientes ? `Subiendo ${visitas(pendientes)}…` : "Actualizando…";
  }

  return (
    <div role="status" className="pointer-events-none fixed inset-x-0 top-0 z-50 mx-auto flex max-w-lg justify-end px-3 pt-[max(0.5rem,env(safe-area-inset-top))]">
      <p className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold shadow ${clase}`}>
        {icono}
        {texto}
      </p>
    </div>
  );
}
