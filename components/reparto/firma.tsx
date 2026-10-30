"use client";

import { Eraser } from "lucide-react";
import { useEffect, useImperativeHandle, useRef, useState } from "react";

export interface PanelFirma {
  /** PNG de la firma, o null si no han firmado. */
  exportar(): Promise<Blob | null>;
}

type Punto = { x: number; y: number }; // proporción del recuadro (0..1): sobrevive a giros de pantalla

/** Recuadro para firmar con el dedo. Funciona sin red: todo queda en el propio móvil. */
export function Firma({ alCambiar, ref }: { alCambiar?: (hayFirma: boolean) => void; ref?: React.Ref<PanelFirma> }) {
  const lienzo = useRef<HTMLCanvasElement>(null);
  const trazos = useRef<Punto[][]>([]);
  const actual = useRef<Punto[] | null>(null);
  const [hayFirma, setHayFirma] = useState(false);

  /** Redibuja todos los trazos al tamaño actual del recuadro. */
  function pintar() {
    const c = lienzo.current;
    if (!c) return;
    const r = c.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const ancho = Math.round(r.width * dpr);
    const alto = Math.round(r.height * dpr);
    if (c.width !== ancho || c.height !== alto) {
      c.width = ancho;
      c.height = alto;
    }
    const ctx = c.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, r.width, r.height);
    ctx.lineWidth = 2.6;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = ctx.fillStyle = "#111827";
    for (const t of [...trazos.current, ...(actual.current ? [actual.current] : [])]) {
      if (t.length === 1) {
        ctx.beginPath();
        ctx.arc(t[0].x * r.width, t[0].y * r.height, 1.3, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }
      ctx.beginPath();
      t.forEach((p, i) => (i ? ctx.lineTo(p.x * r.width, p.y * r.height) : ctx.moveTo(p.x * r.width, p.y * r.height)));
      ctx.stroke();
    }
  }

  useEffect(() => {
    const c = lienzo.current!;
    pintar();
    // Si cambia el tamaño (girar el móvil, teclado…) la firma se redibuja, no se pierde
    const obs = new ResizeObserver(() => pintar());
    obs.observe(c);
    return () => obs.disconnect();
  }, []);

  useEffect(() => alCambiar?.(hayFirma), [hayFirma, alCambiar]);

  useImperativeHandle(ref, () => ({
    async exportar() {
      if (!trazos.current.length) return null;
      const c = lienzo.current!;
      pintar();
      // Fondo blanco: la firma se ve igual en el albarán con tema claro u oscuro
      const copia = document.createElement("canvas");
      copia.width = c.width;
      copia.height = c.height;
      const ctx = copia.getContext("2d")!;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, copia.width, copia.height);
      ctx.drawImage(c, 0, 0);
      return new Promise((ok) => copia.toBlob((b) => ok(b), "image/png"));
    },
  }));

  const punto = (e: React.PointerEvent): Punto => {
    const r = lienzo.current!.getBoundingClientRect();
    return { x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) };
  };

  function borrar() {
    trazos.current = [];
    actual.current = null;
    pintar();
    setHayFirma(false);
  }

  return (
    <div>
      <div className="relative">
        <canvas
          ref={lienzo}
          aria-label="Recuadro para la firma del cliente"
          className="h-44 w-full touch-none rounded-xl border-2 border-dashed border-borde bg-white"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            actual.current = [punto(e)];
            pintar();
          }}
          onPointerMove={(e) => {
            if (!actual.current) return;
            actual.current.push(punto(e));
            pintar();
          }}
          onPointerUp={() => {
            if (!actual.current) return;
            trazos.current.push(actual.current);
            actual.current = null;
            setHayFirma(true);
          }}
          onPointerCancel={() => {
            actual.current = null;
            pintar();
          }}
        />
        {!hayFirma && <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-slate-400">Firme aquí con el dedo</p>}
      </div>
      {hayFirma && (
        <button type="button" onClick={borrar} className="mt-1 inline-flex min-h-10 items-center gap-1 text-sm text-suave underline">
          <Eraser className="h-4 w-4" aria-hidden /> Borrar y volver a firmar
        </button>
      )}
    </div>
  );
}
