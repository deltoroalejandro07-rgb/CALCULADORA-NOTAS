"use client";

import { LogOut, Monitor, Moon, Sun } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { Boton } from "@/components/ui/boton";
import { cn } from "@/lib/cn";
import { supabaseNavegador } from "@/lib/supabase/navegador";

type Tema = "claro" | "oscuro" | "sistema";

const avisos = new Set<() => void>();

function leerTema(): Tema {
  try {
    return (localStorage.getItem("tema") as Tema | null) ?? "sistema";
  } catch {
    return "sistema";
  }
}

function aplicarTema(tema: Tema) {
  try {
    if (tema === "sistema") localStorage.removeItem("tema");
    else localStorage.setItem("tema", tema);
  } catch {}
  const oscuro = tema === "oscuro" || (tema === "sistema" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.setAttribute("data-theme", oscuro ? "dark" : "light");
  avisos.forEach((f) => f());
}

export function SelectorTema() {
  // El servidor no conoce el tema guardado: se lee tras hidratar
  const tema = useSyncExternalStore(
    (f) => {
      avisos.add(f);
      return () => avisos.delete(f);
    },
    leerTema,
    () => "sistema" as Tema,
  );

  const opciones = [
    { valor: "claro", texto: "Claro", icono: Sun },
    { valor: "oscuro", texto: "Oscuro", icono: Moon },
    { valor: "sistema", texto: "Automático", icono: Monitor },
  ] as const;

  return (
    <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Tema">
      {opciones.map(({ valor, texto, icono: Icono }) => (
        <button
          key={valor}
          role="radio"
          aria-checked={tema === valor}
          onClick={() => aplicarTema(valor)}
          className={cn(
            "flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl border text-sm",
            tema === valor ? "border-marca bg-marca-suave font-semibold" : "border-borde",
          )}
        >
          <Icono className="h-5 w-5" aria-hidden />
          {texto}
        </button>
      ))}
    </div>
  );
}

export function CerrarSesion() {
  const [cargando, setCargando] = useState(false);
  return (
    <Boton
      variante="secundario"
      className="w-full"
      cargando={cargando}
      onClick={async () => {
        setCargando(true);
        await supabaseNavegador().auth.signOut();
        // Recarga completa: borra de memoria las pantallas y datos del usuario anterior
        window.location.replace("/login");
      }}
    >
      <LogOut className="h-5 w-5" aria-hidden /> Cerrar sesión
    </Boton>
  );
}
