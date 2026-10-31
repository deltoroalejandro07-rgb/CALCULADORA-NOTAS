"use client";

import { Bell, BellOff, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { avisoDePrueba, borrarSuscripcion, guardarSuscripcion } from "@/app/(app)/avisos-acciones";
import { Boton } from "@/components/ui/boton";

const aBytes = (b64: string) => {
  const s = atob((b64 + "=".repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
};

type Estado = "cargando" | "no-soportado" | "bloqueado" | "activo" | "inactivo";

/** Interruptor «Avisos en este móvil». */
export function AvisosMovil({ clavePublica }: { clavePublica: string | null }) {
  const [estado, setEstado] = useState<Estado>("cargando");
  const [ocupado, setOcupado] = useState(false);
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null);

  useEffect(() => {
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return setEstado("no-soportado");
      if (Notification.permission === "denied") return setEstado("bloqueado");
      const reg = await navigator.serviceWorker.ready;
      setEstado((await reg.pushManager.getSubscription()) ? "activo" : "inactivo");
    })().catch(() => setEstado("no-soportado"));
  }, []);

  async function activar() {
    if (!clavePublica) return;
    setOcupado(true);
    setMensaje(null);
    try {
      if ((await Notification.requestPermission()) !== "granted") {
        setEstado("bloqueado");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: aBytes(clavePublica) }));
      const r = await guardarSuscripcion(sub.toJSON());
      if (r.error) throw new Error(r.error);
      setEstado("activo");
      const p = await avisoDePrueba();
      setMensaje(p.ok ? { ok: true, texto: `${p.ok} Si no lo ves, revisa los permisos de notificaciones del móvil.` } : { ok: false, texto: p.error! });
    } catch (e) {
      setMensaje({ ok: false, texto: e instanceof Error ? e.message : "No se han podido activar los avisos." });
    } finally {
      setOcupado(false);
    }
  }

  async function desactivar() {
    setOcupado(true);
    try {
      const sub = await (await navigator.serviceWorker.ready).pushManager.getSubscription();
      if (sub) {
        await borrarSuscripcion(sub.endpoint);
        await sub.unsubscribe();
      }
      setEstado("inactivo");
      setMensaje(null);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="space-y-2">
      <p className="flex items-center gap-2 text-sm font-medium">
        <Bell className="h-4 w-4 text-marca" aria-hidden /> Avisos en este móvil
      </p>
      <p className="text-xs text-suave">Cada mañana, tu agenda y seguimientos del día; y al conductor, su ruta en cuanto la oficina la prepara.</p>
      {!clavePublica ? (
        <p className="text-sm text-suave">La oficina aún no ha activado los avisos.</p>
      ) : estado === "cargando" ? (
        <Loader2 className="h-4 w-4 animate-spin text-suave" aria-hidden />
      ) : estado === "no-soportado" ? (
        <p className="text-sm text-suave">Este navegador no admite avisos. En iPhone, añade primero la app a la pantalla de inicio (Compartir → «Añadir a pantalla de inicio») y ábrela desde ahí.</p>
      ) : estado === "bloqueado" ? (
        <p className="text-sm text-suave">Las notificaciones están bloqueadas para esta app. Actívalas en los ajustes del navegador o del móvil y vuelve aquí.</p>
      ) : estado === "activo" ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">✓ Activados</span>
          <Boton type="button" variante="secundario" cargando={ocupado} onClick={() => avisoDePrueba().then((p) => setMensaje(p.ok ? { ok: true, texto: p.ok } : { ok: false, texto: p.error! }))} className="min-h-9 px-3 text-sm">
            Probar
          </Boton>
          <Boton type="button" variante="secundario" cargando={ocupado} onClick={desactivar} className="min-h-9 px-3 text-sm">
            <BellOff className="h-4 w-4" aria-hidden /> Desactivar
          </Boton>
        </div>
      ) : (
        <Boton type="button" cargando={ocupado} onClick={activar} className="min-h-10 px-4 text-sm">
          <Bell className="h-4 w-4" aria-hidden /> Activar avisos
        </Boton>
      )}
      {mensaje && <p className={mensaje.ok ? "text-xs text-emerald-700 dark:text-emerald-300" : "text-xs text-red-600"}>{mensaje.texto}</p>}
    </div>
  );
}
