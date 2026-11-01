"use client";

import { useEffect } from "react";

/** Recuerda en este navegador el día de reparto elegido (12 h), para que no «salte» al cambiar de pantalla. */
export function RecordarDia({ fecha }: { fecha: string }) {
  useEffect(() => {
    document.cookie = `dia_reparto=${fecha}; path=/; max-age=43200; samesite=lax`;
  }, [fecha]);
  return null;
}
