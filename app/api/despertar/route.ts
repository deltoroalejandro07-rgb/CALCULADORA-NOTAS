import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { enviarAvisosDiarios } from "@/lib/avisos";

// Vercel la llama una vez al día (vercel.json → crons, 6:00 UTC = 7-8 h en Madrid): una consulta
// mínima para que Supabase (plan Free) no pause el proyecto, y los avisos de la mañana.
export async function GET(request: NextRequest) {
  const secreto = process.env.CRON_SECRET;
  if (secreto && request.headers.get("authorization") !== `Bearer ${secreto}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false },
  });
  const { error } = await sb.from("productos").select("id", { head: true, count: "exact" });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 502 });
  // Avisos de la mañana (agenda, seguimientos y ruta del día), si están configurados
  const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());
  // Solo con CRON_SECRET: así nadie de fuera puede lanzar avisos a todo el equipo
  const avisos = !secreto ? 0 : await enviarAvisosDiarios(hoy).catch((e) => {
    console.error("Avisos diarios:", e);
    return 0;
  });
  return NextResponse.json({ ok: true, avisos });
}
