"use client";

import { Eye, EyeOff } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Boton } from "@/components/ui/boton";
import { mensajeErrorAcceso, sugerirEmail } from "@/lib/dominio/acceso";
import { supabaseEnvioAcceso, supabaseNavegador } from "@/lib/supabase/navegador";

type Paso = "contrasena" | "email" | "codigo";

export function FormularioLogin() {
  const motivo = useSearchParams().get("motivo");
  // Por defecto, email + contraseña (la da el administrador al dar de alta).
  // El email con código/enlace queda como alternativa.
  const [paso, setPaso] = useState<Paso>(motivo === "enlace" ? "email" : "contrasena");
  const [email, setEmail] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [verContrasena, setVerContrasena] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(
    motivo === "sin-acceso"
      ? "Tu usuario está desactivado. Habla con el administrador."
      : motivo === "enlace"
        ? "El enlace ha caducado o ya se usó. Pide uno nuevo."
        : null,
  );

  const emailLimpio = () => email.trim().toLowerCase();
  // Recarga completa: el servidor lee la sesión recién guardada en cookies
  const irAHoy = () => window.location.replace("/hoy");

  async function entrarConContrasena(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError(null);
    const { error } = await supabaseNavegador().auth.signInWithPassword({ email: emailLimpio(), password: contrasena });
    if (error) {
      setCargando(false);
      setError(
        /invalid login|invalid credentials/i.test(error.message)
          ? "Email o contraseña incorrectos. Si no la recuerdas, pide al administrador que te ponga otra."
          : "No se ha podido entrar. ¿Hay conexión?",
      );
      return;
    }
    irAHoy();
  }

  async function pedirCodigo(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError(null);
    const { error } = await supabaseEnvioAcceso().auth.signInWithOtp({
      email: emailLimpio(),
      // Solo entran usuarios dados de alta. Según la plantilla de email llega un código, un enlace (a /auth/confirmar) o ambos.
      options: { shouldCreateUser: false, emailRedirectTo: `${window.location.origin}/auth/confirmar` },
    });
    setCargando(false);
    if (error) {
      setError(mensajeErrorAcceso(error));
      return;
    }
    setPaso("codigo");
  }

  async function verificar(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError(null);
    const { error } = await supabaseNavegador().auth.verifyOtp({ email: emailLimpio(), token: codigo.trim(), type: "email" });
    if (error) {
      setCargando(false);
      setError("Código incorrecto o caducado.");
      return;
    }
    irAHoy();
  }

  function cambiarA(p: Paso) {
    setPaso(p);
    setError(null);
    setCodigo("");
  }

  const campo =
    "w-full rounded-lg border border-borde bg-superficie px-4 py-3.5 text-lg outline-none focus:border-marca focus:ring-2 focus:ring-marca/30";

  const campoEmail = (
    <>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Tu email</span>
        <input
          type="email"
          required
          autoComplete="username"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="nombre@empresa.es"
          className={campo}
        />
      </label>
      {sugerirEmail(email) && (
        <button type="button" onClick={() => setEmail(sugerirEmail(email)!)} className="text-left text-sm text-amber-700 dark:text-amber-300">
          ¿Querías decir <strong className="underline">{sugerirEmail(email)}</strong>?
        </button>
      )}
    </>
  );
  const textoError = error && (
    <p role="alert" className="text-sm text-red-600 dark:text-red-400">
      {error}
    </p>
  );

  if (paso === "contrasena") {
    return (
      <form onSubmit={entrarConContrasena} className="space-y-4">
        {campoEmail}
        <div>
          <label htmlFor="contrasena" className="mb-1.5 block text-sm font-medium">
            Contraseña
          </label>
          <div className="relative">
            <input
              id="contrasena"
              type={verContrasena ? "text" : "password"}
              required
              autoComplete="current-password"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              className={`${campo} pr-14`}
            />
            <button
              type="button"
              onClick={() => setVerContrasena((v) => !v)}
              aria-label={verContrasena ? "Ocultar" : "Mostrar"}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 text-suave"
            >
              {verContrasena ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {textoError}
        <Boton type="submit" cargando={cargando} className="w-full">
          Entrar
        </Boton>
        <button type="button" onClick={() => cambiarA("email")} className="w-full py-2 text-sm text-suave underline">
          Prefiero recibir un email para entrar
        </button>
      </form>
    );
  }

  if (paso === "email") {
    return (
      <form onSubmit={pedirCodigo} className="space-y-4">
        {campoEmail}
        {textoError}
        <Boton type="submit" cargando={cargando} className="w-full">
          Enviarme un código
        </Boton>
        <p className="text-center text-sm text-suave">Te llegará un email para entrar.</p>
        <button type="button" onClick={() => cambiarA("contrasena")} className="w-full py-2 text-sm text-suave underline">
          Entrar con contraseña
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={verificar} className="space-y-4">
      <p className="text-sm text-suave">
        Hemos enviado un email a <strong className="text-texto">{email}</strong>. Escribe aquí el código o, si trae un enlace, púlsalo.
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
      {textoError}
      <Boton type="submit" cargando={cargando} className="w-full">
        Entrar
      </Boton>
      <button type="button" onClick={() => cambiarA("email")} className="w-full py-2 text-sm text-suave underline">
        Usar otro email
      </button>
    </form>
  );
}
