import { CalendarClock, ChevronRight } from "lucide-react";
import Link from "next/link";
import { fechaDentroDe } from "@/lib/dominio/visita";
import { supabaseServidor } from "@/lib/supabase/servidor";

/** Lo apuntado en la agenda para hoy (y tareas atrasadas), en el panel Hoy. */
export async function AgendaDeHoy() {
  const hoy = fechaDentroDe(0);
  const sb = await supabaseServidor();
  const { data } = await sb
    .from("agenda")
    .select("id, tipo, titulo, fecha, hora_inicio, lugar, hecha, clientes(nombre_negocio)")
    .neq("tipo", "nota")
    .or(`fecha.eq.${hoy},and(tipo.eq.tarea,hecha.eq.false,fecha.lt.${hoy})`)
    .order("hora_inicio", { nullsFirst: false })
    .limit(20);
  const lista = (data ?? []).filter((e) => !(e.tipo === "tarea" && e.hecha));
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-[13px] font-semibold text-suave">
          <CalendarClock className="h-4 w-4 text-marca" aria-hidden /> Agenda de hoy
        </h2>
        <Link href="/agenda" className="flex items-center text-sm font-medium text-marca">
          Abrir agenda <ChevronRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
      {lista.length ? (
        <ul className="divide-y divide-borde overflow-hidden rounded-xl border border-borde bg-superficie text-sm shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          {lista.map((e) => (
            <li key={e.id}>
              <Link href={`/agenda?dia=${e.fecha ?? hoy}`} className="flex items-center gap-3 px-3 py-2.5 hover:bg-fondo/70">
                <span className="w-12 shrink-0 font-semibold tabular-nums text-marca">{e.tipo === "tarea" ? "Tarea" : (e.hora_inicio?.slice(0, 5) ?? "—")}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{e.titulo}</span>
                  {(e.lugar || e.clientes?.nombre_negocio || (e.fecha && e.fecha < hoy)) && (
                    <span className="block truncate text-xs text-suave">
                      {[e.fecha && e.fecha < hoy && "Atrasada", e.clientes?.nombre_negocio, e.lugar].filter(Boolean).join(" · ")}
                    </span>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <Link href="/agenda" className="block rounded-xl border border-dashed border-borde px-3 py-3 text-sm text-suave hover:border-marca/40">
          Nada en la agenda para hoy. Pulsa para apuntar una reunión o una tarea.
        </Link>
      )}
    </section>
  );
}
