"use client";

import { LogOut, Monitor, Moon, Sun } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { Boton } from "@/components/ui/boton";
import { cn } from "@/lib/cn";
import { baseLocal } from "@/lib/offline/db";
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
        const db = baseLocal();
        const pendientes = await db.cola.count();
        if (
          pendientes &&
          !confirm(`Tienes ${pendientes} ${pendientes === 1 ? "registro" : "registros"} sin subir. Si cierras sesión ahora se perderán. ¿Salir igualmente?`)
        )
          return;
        setCargando(true);
        await supabaseNavegador().auth.signOut();
        // Los datos de clientes guardados en el móvil no deben quedar para el siguiente usuario
        await db.delete();
        navigator.serviceWorker?.controller?.postMessage("borrar-cache");
        // Recarga completa: borra de memoria las pantallas y datos del usuario anterior
        window.location.replace("/login");
      }}
    >
      <LogOut className="h-5 w-5" aria-hidden /> Cerrar sesión
    </Boton>
  );
}

export function CambiarContrasena() {
  const [abierto, setAbierto] = useState(false);
  const [nueva, setNueva] = useState("");
  const [repetida, setRepetida] = useState("");
  const [estado, setEstado] = useState<{ ok?: string; error?: string }>({});
  const [guardando, setGuardando] = useState(false);

  if (!abierto) {
    return (
      <button type="button" onClick={() => setAbierto(true)} className="text-sm font-medium text-marca underline">
        Cambiar mi contraseña
      </button>
    );
  }
  const campo = "mt-1 min-h-12 w-full rounded-xl border border-borde bg-superficie px-3 outline-none focus:border-marca";
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (nueva.length < 8) return setEstado({ error: "Mínimo 8 caracteres." });
        if (nueva !== repetida) return setEstado({ error: "Las dos contraseñas no coinciden." });
        setGuardando(true);
        const { error } = await supabaseNavegador().auth.updateUser({ password: nueva });
        setGuardando(false);
        if (error) return setEstado({ error: /different|same/i.test(error.message) ? "Tiene que ser distinta de la actual." : "No se ha podido cambiar. ¿Hay conexión?" });
        setEstado({ ok: "Contraseña cambiada. Úsala la próxima vez que entres." });
        setNueva("");
        setRepetida("");
      }}
      className="space-y-3"
    >
      <label className="block text-sm font-medium">
        Nueva contraseña
        <input type="password" autoComplete="new-password" value={nueva} onChange={(e) => setNueva(e.target.value)} className={campo} />
      </label>
      <label className="block text-sm font-medium">
        Repítela
        <input type="password" autoComplete="new-password" value={repetida} onChange={(e) => setRepetida(e.target.value)} className={campo} />
      </label>
      {estado.error && <p className="text-sm text-red-600">{estado.error}</p>}
      {estado.ok && <p className="text-sm text-emerald-700 dark:text-emerald-300">✓ {estado.ok}</p>}
      <div className="flex gap-2">
        <Boton type="submit" cargando={guardando} className="flex-1">
          Guardar
        </Boton>
        <Boton type="button" variante="secundario" onClick={() => setAbierto(false)}>
          Cerrar
        </Boton>
      </div>
    </form>
  );
}
