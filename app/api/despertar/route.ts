import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

// Vercel la llama una vez al día (vercel.json → crons): una consulta mínima para que
// Supabase (plan Free) no pause el proyecto tras una semana sin uso.
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
  return NextResponse.json({ ok: true });
}
