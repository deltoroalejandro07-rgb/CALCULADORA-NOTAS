"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Boton } from "@/components/ui/boton";
import { supabaseNavegador } from "@/lib/supabase/navegador";

export function FormularioLogin() {
  const router = useRouter();
  const motivo = useSearchParams().get("motivo");
  const [paso, setPaso] = useState<"email" | "codigo">("email");
  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(
    motivo === "sin-acceso"
      ? "Tu usuario está desactivado. Habla con el administrador."
      : motivo === "enlace"
        ? "El enlace ha caducado o ya se usó. Pide uno nuevo."
        : null,
  );

  async function pedirCodigo(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError(null);
    const { error } = await supabaseNavegador().auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      // Solo entran usuarios invitados por el administrador. Según la plantilla de
      // email llega un código, un enlace (a /auth/confirmar) o ambos.
      options: { shouldCreateUser: false, emailRedirectTo: `${window.location.origin}/auth/confirmar` },
    });
    setCargando(false);
    if (error) {
      setError(
        error.status === 422 || /signups not allowed|not found/i.test(error.message)
          ? "Ese email no tiene acceso. Pide al administrador que te invite."
          : "No se ha podido enviar el código. Inténtalo de nuevo en un momento.",
      );
      return;
    }
    setPaso("codigo");
  }

  async function verificar(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError(null);
    const { error } = await supabaseNavegador().auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: codigo.trim(),
      type: "email",
    });
    if (error) {
      setCargando(false);
      setError("Código incorrecto o caducado.");
      return;
    }
    router.replace("/hoy");
    router.refresh();
  }

  const campo =
    "w-full rounded-xl border border-borde bg-superficie px-4 py-3.5 text-lg outline-none focus:border-marca focus:ring-2 focus:ring-marca/30";

  return paso === "email" ? (
    <form onSubmit={pedirCodigo} className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Tu email</span>
        <input
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="nombre@empresa.es"
          className={campo}
        />
      </label>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <Boton type="submit" cargando={cargando} className="w-full">
        Enviarme un código
      </Boton>
      <p className="text-center text-sm text-suave">Te llegará un email para entrar.</p>
    </form>
  ) : (
    <form onSubmit={verificar} className="space-y-4">
      <p className="text-sm text-suave">
        Hemos enviado un email a <strong className="text-texto">{email}</strong>. Escribe aquí el código o, si trae un
        enlace, ábrelo <strong className="text-texto">en este mismo móvil y navegador</strong>.
      </p>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Código</span>
        <input
          required
          autoFocus
          autoComplete="one-time-code"
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={6}
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))}
          placeholder="123456"
          className={`${campo} text-center text-2xl tracking-[0.5em]`}
        />
      </label>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <Boton type="submit" cargando={cargando} className="w-full">
        Entrar
      </Boton>
      <button
        type="button"
        onClick={() => {
          setPaso("email");
          setCodigo("");
          setError(null);
        }}
        className="w-full py-2 text-sm text-suave underline"
      >
        Usar otro email
      </button>
    </form>
  );
}
