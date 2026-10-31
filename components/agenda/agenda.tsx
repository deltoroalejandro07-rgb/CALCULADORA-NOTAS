"use client";

import { CalendarClock, Check, ChevronLeft, ChevronRight, ClipboardList, MapPin, Pencil, Plus, Search, StickyNote, Trash2, Users, X } from "lucide-react";
import Link from "next/link";
import { startTransition, useActionState, useEffect, useMemo, useState } from "react";
import { borrarEvento, cambiarHecha, guardarEvento, type EstadoForm } from "@/app/(app)/agenda/acciones";
import { Boton } from "@/components/ui/boton";
import { cn } from "@/lib/cn";
import { normalizarTexto } from "@/lib/dominio/visita";
import { fecha as formatoFecha } from "@/lib/formato";

export interface EventoAgenda {
  id: string;
  tipo: "reunion" | "tarea" | "nota";
  titulo: string;
  fecha: string | null;
  hora_inicio: string | null;
  hora_fin: string | null;
  lugar: string | null;
  cliente_id: string | null;
  cliente: string | null;
  notas: string | null;
  hecha: boolean;
}

type Cliente = { id: string; nombre: string };

const TIPOS = [
  { v: "reunion", texto: "Reunión", icono: Users },
  { v: "tarea", texto: "Tarea", icono: ClipboardList },
  { v: "nota", texto: "Nota", icono: StickyNote },
] as const;

const campo = "mt-1 min-h-11 w-full rounded-lg border border-borde bg-superficie px-3 text-sm outline-none focus:border-marca lg:min-h-10";
const sumar = (d: string, n: number) => new Date(Date.parse(d + "T12:00:00Z") + n * 86_400_000).toISOString().slice(0, 10);
const DIAS = ["L", "M", "X", "J", "V", "S", "D"];
const tituloDia = (d: string, hoy: string) => {
  const t = new Date(d + "T12:00:00").toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
  const pref = d === hoy ? "Hoy, " : d === sumar(hoy, 1) ? "Mañana, " : d === sumar(hoy, -1) ? "Ayer, " : "";
  return pref ? pref + t : t.charAt(0).toUpperCase() + t.slice(1);
};

export function Agenda({
  dia,
  hoy,
  lunes,
  semana,
  notas,
  atrasadas,
  clientes,
}: {
  dia: string;
  hoy: string;
  lunes: string;
  semana: EventoAgenda[];
  notas: EventoAgenda[];
  atrasadas: EventoAgenda[];
  clientes: Cliente[];
}) {
  const [pestana, setPestana] = useState<"calendario" | "notas">("calendario");
  const [form, setForm] = useState<{ evento: Partial<EventoAgenda> } | null>(null);
  const delDia = semana.filter((e) => e.fecha === dia).sort((a, b) => (a.hora_inicio ?? "").localeCompare(b.hora_inicio ?? ""));
  const dias = Array.from({ length: 7 }, (_, i) => sumar(lunes, i));
  const mes = new Date(lunes + "T12:00:00").toLocaleDateString("es-ES", { month: "long", year: "numeric" });

  const nuevo = (tipo: EventoAgenda["tipo"]) => setForm({ evento: { tipo, fecha: tipo === "nota" ? null : dia } });

  return (
    <div className="px-4 pb-8">
      {/* Móvil: pestañas. Ordenador: calendario y notas lado a lado */}
      <div className="mb-3 grid grid-cols-2 gap-1 rounded-lg border border-borde bg-superficie p-1 lg:hidden">
        {(["calendario", "notas"] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPestana(p)}
            className={cn("min-h-10 rounded-md text-sm font-medium", pestana === p ? "bg-marca-suave text-marca" : "text-suave")}
          >
            {p === "calendario" ? "Calendario" : `Notas (${notas.length})`}
          </button>
        ))}
      </div>

      {form && <FormularioEvento key={form.evento.id ?? `nuevo-${form.evento.tipo}`} evento={form.evento} clientes={clientes} alCerrar={() => setForm(null)} />}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className={cn("space-y-4", pestana !== "calendario" && "hidden lg:block")}>
          <div className="rounded-xl border border-borde bg-superficie p-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <div className="mb-2 flex items-center justify-between">
              <Link href={`/agenda?dia=${sumar(dia, -7)}`} aria-label="Semana anterior" className="rounded-lg p-2 text-suave hover:bg-fondo">
                <ChevronLeft className="h-5 w-5" />
              </Link>
              <div className="text-center">
                <p className="text-sm font-semibold capitalize">{mes}</p>
                {dia !== hoy && (
                  <Link href="/agenda" className="text-xs text-marca underline">
                    Ir a hoy
                  </Link>
                )}
              </div>
              <Link href={`/agenda?dia=${sumar(dia, 7)}`} aria-label="Semana siguiente" className="rounded-lg p-2 text-suave hover:bg-fondo">
                <ChevronRight className="h-5 w-5" />
              </Link>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {dias.map((d, i) => {
                const n = semana.filter((e) => e.fecha === d).length;
                const activo = d === dia;
                return (
                  <Link
                    key={d}
                    href={`/agenda?dia=${d}`}
                    aria-label={tituloDia(d, hoy)}
                    aria-current={activo ? "date" : undefined}
                    className={cn(
                      "flex flex-col items-center rounded-lg py-1.5 text-xs transition",
                      activo ? "bg-marca text-marca-texto" : d === hoy ? "bg-marca-suave text-marca" : "hover:bg-fondo",
                    )}
                  >
                    <span className={cn(activo ? "opacity-90" : "text-suave")}>{DIAS[i]}</span>
                    <span className="text-base font-semibold tabular-nums">{Number(d.slice(8))}</span>
                    <span className={cn("mt-0.5 h-1.5 w-1.5 rounded-full", n ? (activo ? "bg-marca-texto" : "bg-marca") : "bg-transparent")} />
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">{tituloDia(dia, hoy)}</h2>
            <div className="flex gap-2">
              <Boton type="button" variante="secundario" onClick={() => nuevo("tarea")} className="min-h-10 px-3 text-sm">
                <ClipboardList className="h-4 w-4" aria-hidden /> Tarea
              </Boton>
              <Boton type="button" onClick={() => nuevo("reunion")} className="min-h-10 px-3 text-sm">
                <Plus className="h-4 w-4" aria-hidden /> Reunión
              </Boton>
            </div>
          </div>

          {dia === hoy && atrasadas.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 dark:border-amber-900 dark:bg-amber-950/30">
              <p className="mb-1 text-[13px] font-semibold text-amber-800 dark:text-amber-200">Tareas sin hacer de días anteriores</p>
              <ul className="divide-y divide-amber-200/70 dark:divide-amber-900">
                {atrasadas.map((e) => (
                  <FilaEvento key={e.id} e={e} conFecha onEditar={() => setForm({ evento: e })} />
                ))}
              </ul>
            </div>
          )}

          {delDia.length ? (
            <ul className="divide-y divide-borde overflow-hidden rounded-xl border border-borde bg-superficie shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
              {delDia.map((e) => (
                <FilaEvento key={e.id} e={e} onEditar={() => setForm({ evento: e })} />
              ))}
            </ul>
          ) : (
            <div className="rounded-xl border border-dashed border-borde p-6 text-center text-sm text-suave">
              <CalendarClock className="mx-auto mb-2 h-6 w-6" aria-hidden />
              Nada apuntado este día.
            </div>
          )}
        </section>

        <Notas notas={notas} visible={pestana === "notas"} onNueva={() => nuevo("nota")} onEditar={(e) => setForm({ evento: e })} />
      </div>
    </div>
  );
}

function FilaEvento({ e, conFecha, onEditar }: { e: EventoAgenda; conFecha?: boolean; onEditar: () => void }) {
  const esTarea = e.tipo === "tarea";
  return (
    <li className="flex items-start gap-3 px-3 py-3">
      {esTarea ? (
        <form action={cambiarHecha}>
          <input type="hidden" name="id" value={e.id} />
          <input type="hidden" name="hecha" value={String(!e.hecha)} />
          <button
            type="submit"
            aria-label={e.hecha ? `Marcar «${e.titulo}» como pendiente` : `Marcar «${e.titulo}» como hecha`}
            className={cn("mt-0.5 flex h-5 w-5 items-center justify-center rounded border", e.hecha ? "border-marca bg-marca text-marca-texto" : "border-borde hover:border-marca")}
          >
            {e.hecha && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
          </button>
        </form>
      ) : (
        <span className="w-12 shrink-0 pt-0.5 text-sm font-semibold tabular-nums text-marca">{e.hora_inicio ?? "—"}</span>
      )}
      <button type="button" onClick={onEditar} className="min-w-0 flex-1 text-left">
        <span className={cn("block font-medium", e.hecha && "text-suave line-through")}>{e.titulo}</span>
        <span className="block text-xs text-suave">
          {[
            conFecha && e.fecha && formatoFecha(e.fecha),
            !esTarea && e.hora_fin && `hasta ${e.hora_fin}`,
            esTarea && e.hora_inicio,
            e.cliente,
          ]
            .filter(Boolean)
            .join(" · ")}
        </span>
        {e.lugar && (
          <span className="mt-0.5 flex items-center gap-1 text-xs text-suave">
            <MapPin className="h-3 w-3" aria-hidden /> {e.lugar}
          </span>
        )}
        {e.notas && <span className="mt-1 line-clamp-2 block text-sm text-suave">{e.notas}</span>}
      </button>
      <button type="button" onClick={onEditar} aria-label={`Editar «${e.titulo}»`} className="rounded-md p-1.5 text-suave hover:bg-fondo">
        <Pencil className="h-4 w-4" />
      </button>
    </li>
  );
}

function Notas({ notas, visible, onNueva, onEditar }: { notas: EventoAgenda[]; visible: boolean; onNueva: () => void; onEditar: (e: EventoAgenda) => void }) {
  const [q, setQ] = useState("");
  const filtradas = useMemo(() => {
    const t = normalizarTexto(q);
    return t ? notas.filter((n) => normalizarTexto(`${n.titulo} ${n.notas ?? ""} ${n.cliente ?? ""}`).includes(t)) : notas;
  }, [notas, q]);
  return (
    <aside className={cn("space-y-3", !visible && "hidden lg:block")}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Notas</h2>
        <Boton type="button" variante="secundario" onClick={onNueva} className="min-h-10 px-3 text-sm">
          <Plus className="h-4 w-4" aria-hidden /> Nota
        </Boton>
      </div>
      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-suave" aria-hidden />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar en las notas" aria-label="Buscar en las notas" className={cn(campo, "mt-0 pl-9")} />
      </label>
      {filtradas.length ? (
        <ul className="space-y-2">
          {filtradas.map((n) => (
            <li key={n.id}>
              <button type="button" onClick={() => onEditar(n)} className="w-full rounded-xl border border-borde bg-superficie p-3 text-left shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:border-marca/40">
                <span className="block font-medium">{n.titulo}</span>
                {n.cliente && <span className="block text-xs text-marca">{n.cliente}</span>}
                {n.notas && <span className="mt-1 line-clamp-4 block whitespace-pre-line text-sm text-suave">{n.notas}</span>}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-borde p-5 text-center text-sm text-suave">{q ? "Ninguna nota con ese texto." : "Apunta aquí lo que quieras recordar."}</p>
      )}
    </aside>
  );
}

function FormularioEvento({ evento, clientes, alCerrar }: { evento: Partial<EventoAgenda>; clientes: Cliente[]; alCerrar: () => void }) {
  const [estado, accion, pendiente] = useActionState<EstadoForm, FormData>(guardarEvento, {});
  const [tipo, setTipo] = useState<EventoAgenda["tipo"]>(evento.tipo ?? "reunion");
  useEffect(() => {
    if (estado.ok) alCerrar();
  }, [estado.ok, alCerrar]);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && alCerrar();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [alCerrar]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 lg:items-center" onClick={alCerrar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={evento.id ? "Editar" : "Añadir a la agenda"}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl bg-superficie p-4 shadow-xl lg:max-w-lg lg:rounded-xl lg:p-6"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{evento.id ? "Editar" : "Añadir"}</h2>
          <button type="button" onClick={alCerrar} aria-label="Cerrar" className="rounded-md p-1.5 text-suave hover:bg-fondo">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const datos = new FormData(e.currentTarget);
            startTransition(() => accion(datos));
          }}
          className="space-y-3"
        >
          <input type="hidden" name="id" value={evento.id ?? ""} />
          <input type="hidden" name="tipo" value={tipo} />
          <div className="grid grid-cols-3 gap-1 rounded-lg border border-borde p-1" role="radiogroup" aria-label="Tipo">
            {TIPOS.map(({ v, texto, icono: Icono }) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={tipo === v}
                onClick={() => setTipo(v)}
                className={cn("flex min-h-10 items-center justify-center gap-1.5 rounded-md text-sm font-medium", tipo === v ? "bg-marca-suave text-marca" : "text-suave")}
              >
                <Icono className="h-4 w-4" aria-hidden /> {texto}
              </button>
            ))}
          </div>
          <label className="block text-sm font-medium">
            Título
            <input
              name="titulo"
              required
              autoFocus
              defaultValue={evento.titulo ?? ""}
              placeholder={tipo === "reunion" ? "Reunión con el proveedor" : tipo === "tarea" ? "Llamar a Bar Manolo" : "Ideas para la feria"}
              className={campo}
            />
          </label>
          {tipo !== "nota" && (
            <div className="grid grid-cols-3 gap-2">
              <label className="col-span-3 block text-sm font-medium sm:col-span-1">
                Día
                <input type="date" name="fecha" required defaultValue={evento.fecha ?? ""} className={campo} />
              </label>
              <label className="block text-sm font-medium">
                {tipo === "tarea" ? "Hora (opcional)" : "Empieza"}
                <input type="time" name="hora_inicio" defaultValue={evento.hora_inicio ?? ""} className={campo} />
              </label>
              {tipo === "reunion" ? (
                <label className="block text-sm font-medium">
                  Termina
                  <input type="time" name="hora_fin" defaultValue={evento.hora_fin ?? ""} className={campo} />
                </label>
              ) : (
                <span />
              )}
            </div>
          )}
          {tipo === "reunion" && (
            <label className="block text-sm font-medium">
              Lugar
              <input name="lugar" defaultValue={evento.lugar ?? ""} placeholder="Oficina, dirección o videollamada" className={campo} />
            </label>
          )}
          <label className="block text-sm font-medium">
            Cliente (opcional)
            <select name="cliente_id" defaultValue={evento.cliente_id ?? ""} className={campo}>
              <option value="">— Ninguno —</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium">
            {tipo === "nota" ? "Texto" : "Notas"}
            <textarea name="notas" rows={tipo === "nota" ? 7 : 4} defaultValue={evento.notas ?? ""} placeholder="Apunta aquí la información" className={cn(campo, "py-2")} />
          </label>
          {estado.error && (
            <p role="alert" className="text-sm text-red-600">
              {estado.error}
            </p>
          )}
          <div className="flex gap-2 pt-1">
            {evento.id && (
              <Boton
                type="button"
                variante="secundario"
                className="text-red-600"
                aria-label="Borrar"
                onClick={() => {
                  if (!confirm("¿Borrar?")) return;
                  const f = new FormData();
                  f.set("id", evento.id!);
                  startTransition(async () => {
                    await borrarEvento(f);
                    alCerrar();
                  });
                }}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </Boton>
            )}
            <Boton type="submit" cargando={pendiente} className="flex-1">
              Guardar
            </Boton>
          </div>
        </form>
      </div>
    </div>
  );
}
