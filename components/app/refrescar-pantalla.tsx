"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Que nunca se vea una pantalla vieja: al ir atrás/adelante o a otra pantalla (Next guarda las
 * visitadas y las vuelve a enseñar tal cual) y al volver a la app desde WhatsApp o Maps, se piden
 * otra vez los datos al servidor. Lo ya escrito en los formularios no se pierde.
 */
export function RefrescarPantalla() {
  const router = useRouter();
  const ruta = usePathname();
  const params = useSearchParams().toString();
  const primera = useRef(true);
  const ultima = useRef(0);

  useEffect(() => {
    const refrescar = () => {
      if (!navigator.onLine || Date.now() - ultima.current < 1000) return;
      ultima.current = Date.now();
      router.refresh();
    };
    if (primera.current) primera.current = false;
    else refrescar();
    const alVolver = () => document.visibilityState === "visible" && refrescar();
    const alMostrar = (e: PageTransitionEvent) => e.persisted && refrescar();
    document.addEventListener("visibilitychange", alVolver);
    window.addEventListener("pageshow", alMostrar);
    return () => {
      document.removeEventListener("visibilitychange", alVolver);
      window.removeEventListener("pageshow", alMostrar);
    };
  }, [router, ruta, params]);

  return null;
}
