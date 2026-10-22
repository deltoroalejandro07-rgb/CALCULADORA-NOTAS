"use client";

import type { EmailOtpType } from "@supabase/supabase-js";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { supabaseNavegador } from "@/lib/supabase/navegador";

/**
 * Destino del enlace del email de acceso. Admite los tres formatos de Supabase:
 * #access_token=… (flujo implícito, el que usamos), ?code=… (PKCE) y ?token_hash=…&type=…
 * La sesión se guarda en cookies, así que el servidor la ve en la siguiente página.
 */
export function Confirmar() {
  const params = useSearchParams();

  useEffect(() => {
    const sb = supabaseNavegador();
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const code = params.get("code");
    const tokenHash = params.get("token_hash");
    const tipo = params.get("type") as EmailOtpType | null;

    async function entrar() {
      if (hash.get("access_token") && hash.get("refresh_token")) {
        return !(await sb.auth.setSession({ access_token: hash.get("access_token")!, refresh_token: hash.get("refresh_token")! })).error;
      }
      if (code) return !(await sb.auth.exchangeCodeForSession(code)).error;
      if (tokenHash && tipo) return !(await sb.auth.verifyOtp({ token_hash: tokenHash, type: tipo })).error;
      return false;
    }

    entrar()
      .catch(() => false)
      // Recarga completa para que el servidor lea la sesión recién guardada
      .then((ok) => window.location.replace(ok ? "/hoy" : "/login?motivo=enlace"));
  }, [params]);

  return <p>Entrando…</p>;
}
