"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

/** Reduce la foto a 1600 px de lado mayor en JPEG (~200-400 KB) antes de guardarla. */
export async function comprimirFoto(fichero: Blob, ladoMax = 1600, calidad = 0.8): Promise<Blob> {
  const imagen = await createImageBitmap(fichero, { imageOrientation: "from-image" });
  const escala = Math.min(1, ladoMax / Math.max(imagen.width, imagen.height));
  const lienzo = document.createElement("canvas");
  lienzo.width = Math.round(imagen.width * escala);
  lienzo.height = Math.round(imagen.height * escala);
  lienzo.getContext("2d")!.drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
  imagen.close();
  return new Promise((ok, mal) => lienzo.toBlob((b) => (b ? ok(b) : mal(new Error("No se pudo comprimir"))), "image/jpeg", calidad));
}

export interface Posicion {
  lat: number;
  lng: number;
  precision: number;
}

/** Posición GPS al abrir la pantalla. Si el usuario no da permiso, simplemente no hay. */
export function useUbicacion() {
  const [pos, setPos] = useState<Posicion | null>(null);
  const [estado, setEstado] = useState<"buscando" | "ok" | "sin-permiso" | "no-disponible">(() =>
    typeof navigator !== "undefined" && !("geolocation" in navigator) ? "no-disponible" : "buscando",
  );

  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    const id = navigator.geolocation.watchPosition(
      (p) => {
        setPos({ lat: p.coords.latitude, lng: p.coords.longitude, precision: p.coords.accuracy });
        setEstado("ok");
      },
      (e) => setEstado(e.code === e.PERMISSION_DENIED ? "sin-permiso" : "no-disponible"),
      { enableHighAccuracy: true, maximumAge: 60_000, timeout: 15_000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  return { pos, estado };
}

function suscribirConexion(aviso: () => void) {
  window.addEventListener("online", aviso);
  window.addEventListener("offline", aviso);
  return () => {
    window.removeEventListener("online", aviso);
    window.removeEventListener("offline", aviso);
  };
}

export function useEnLinea() {
  return useSyncExternalStore(suscribirConexion, () => navigator.onLine, () => true);
}

// Web Speech API: Chrome/Android y Safari reciente. Necesita conexión en la mayoría de móviles;
// el micrófono del teclado del teléfono funciona siempre como alternativa.
interface Reconocimiento {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

function constructorReconocimiento(): (new () => Reconocimiento) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Reconocimiento; webkitSpeechRecognition?: new () => Reconocimiento };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function useDictado(alTexto: (texto: string) => void) {
  const disponible = useSyncExternalStore(
    () => () => {},
    () => constructorReconocimiento() !== null,
    () => false,
  );
  const [escuchando, setEscuchando] = useState(false);
  const rec = useRef<Reconocimiento | null>(null);
  const callback = useRef(alTexto);
  useEffect(() => {
    callback.current = alTexto;
  });

  function alternar() {
    if (escuchando) {
      rec.current?.stop();
      return;
    }
    const Ctor = constructorReconocimiento();
    if (!Ctor) return;
    const r = new Ctor();
    r.lang = "es-ES";
    r.continuous = true;
    r.interimResults = false;
    r.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) callback.current(e.results[i][0].transcript.trim());
      }
    };
    r.onend = () => setEscuchando(false);
    r.onerror = () => setEscuchando(false);
    rec.current = r;
    r.start();
    setEscuchando(true);
  }

  return { disponible, escuchando, alternar };
}
