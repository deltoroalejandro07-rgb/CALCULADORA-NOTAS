"use client";

import { KeyRound, UserPlus } from "lucide-react";
import { startTransition, useActionState, useState, useTransition } from "react";
import { cambiarUsuario, crearUsuario, type Resultado } from "@/app/(app)/ajustes/usuarios/acciones";
import { Tarjeta } from "@/components/app/piezas";
import { Boton } from "@/components/ui/boton";
import { cn } from "@/lib/cn";

interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: "admin" | "comercial" | "repartidor";
  activo: boolean;
  clientes: number;
}

/** Contraseña fácil de dictar por teléfono: palabra + 4 cifras (p. ej. «barril4821»). */
function generarContrasena() {
  const palabras = ["barril", "terraza", "vermut", "cafe", "tapas", "botella", "pedido", "ruta", "cana", "menu"];
  const n = new Uint32Array(2);
  crypto.getRandomValues(n);
  return `${palabras[n[0] % palabras.length]}${String(1000 + (n[1] % 9000))}`;
}

function CampoContrasena() {
  const [valor, setValor] = useState("");
  return (
    <label className="block text-sm font-medium">
      Contraseña
      <div className="mt-1 flex gap-2">
        <input name="contrasena" required minLength={8} value={valor} onChange={(e) => setValor(e.target.value)} autoComplete="off" placeholder="mínimo 8 caracteres" className={`${campo} mt-0 flex-1`} />
        <button type="button" onClick={() => setValor(generarContrasena())} className="rounded-lg border border-borde px-3 text-sm font-medium">
          Generar
        </button>
      </div>
    </label>
  );
}

const campo = "mt-1 min-h-12 w-full rounded-lg border border-borde bg-superficie px-3 outline-none focus:border-marca";

export function GestionUsuarios({ yo, usuarios, claveConfigurada, urlApp }: { yo: string; usuarios: Usuario[]; claveConfigurada: boolean; urlApp: string | null }) {
  const [alta, accionAlta, creando] = useActionState<Resultado, FormData>(crearUsuario, {});
  const [aviso, setAviso] = useState<Resultado>({});
  const [pendiente, iniciar] = useTransition();
  const activos = usuarios.filter((u) => u.activo);

  function cambiar(datos: Record<string, string>) {
    const f = new FormData();
    Object.entries(datos).forEach(([k, v]) => f.set(k, v));
    iniciar(async () => setAviso(await cambiarUsuario(f)));
  }

  return (
    <div className="space-y-5 px-4 pb-8">
      {!claveConfigurada && (
        <Tarjeta className="border-amber-400 bg-amber-50 text-sm dark:bg-amber-950/40">
          <p className="flex items-center gap-1.5 font-semibold">
            <KeyRound className="h-4 w-4" aria-hidden /> Falta un ajuste para poder dar de alta usuarios
          </p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>
              En Supabase: <strong>Project Settings → API Keys</strong>, copia la <strong>Secret key</strong> (<code>sb_secret_…</code>).
            </li>
            <li>
              En Vercel: proyecto → <strong>Settings → Environment Variables</strong> → añade <code>SUPABASE_SECRET_KEY</code> con ese valor.
            </li>
            <li>
              En Vercel: <strong>Deployments</strong> → en el último, <strong>⋯ → Redeploy</strong>.
            </li>
          </ol>
          <p className="mt-2 text-xs text-suave">Mientras tanto puedes cambiar roles y desactivar usuarios existentes.</p>
        </Tarjeta>
      )}

      <section>
        <h2 className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-suave">
          <UserPlus className="h-4 w-4" aria-hidden /> Dar de alta
        </h2>
        <form
          // Se vuelve a montar (vacío) solo cuando un alta sale bien; si hay error se conserva lo escrito
          key={alta.ok ?? "alta"}
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            startTransition(() => accionAlta(f));
          }}
          className="space-y-3 rounded-xl border border-borde bg-superficie p-4"
        >
          <label className="block text-sm font-medium">
            Nombre
            <input name="nombre" required autoCapitalize="words" placeholder="Ana López" className={campo} />
          </label>
          <label className="block text-sm font-medium">
            Email
            <input name="email" type="email" required inputMode="email" placeholder="ana@tuempresa.es" className={campo} />
          </label>
          <CampoContrasena />
          <label className="block text-sm font-medium">
            Rol
            <select name="rol" defaultValue="comercial" className={campo}>
              <option value="comercial">Comercial (ve solo sus clientes)</option>
              <option value="repartidor">Repartidor (solo Mi reparto)</option>
              <option value="admin">Administrador (ve todo)</option>
            </select>
          </label>
          {alta.error && <p className="text-sm text-red-600">{alta.error}</p>}
          {alta.ok && (
            <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100">
              ✓ {alta.ok} Pásale estos datos y la dirección {urlApp ?? window.location.origin}. Podrá cambiar la contraseña en Más.
            </p>
          )}
          <Boton type="submit" cargando={creando} className="w-full">
            Dar de alta
          </Boton>
        </form>
      </section>

      <section>
        <h2 className="mb-2 text-[13px] font-semibold text-suave">Equipo ({activos.length} activos)</h2>
        {aviso.error && <p className="mb-2 text-sm text-red-600">{aviso.error}</p>}
        {aviso.ok && aviso.ok !== "Hecho." && <p className="mb-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100">✓ {aviso.ok}</p>}
        <ul className="space-y-2">
          {usuarios.map((u) => (
            <li key={u.id} className={cn("rounded-xl border border-borde bg-superficie p-4", !u.activo && "opacity-60")}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold">
                    {u.nombre} {u.id === yo && <span className="text-xs font-normal text-suave">(tú)</span>}
                  </p>
                  <p className="truncate text-sm text-suave">{u.email}</p>
                  <p className="text-xs text-suave">
                    {u.clientes} cliente{u.clientes === 1 ? "" : "s"} · {u.activo ? "Activo" : "Desactivado"}
                  </p>
                </div>
                <select
                  value={u.rol}
                  disabled={u.id === yo || pendiente}
                  onChange={(e) => cambiar({ id: u.id, accion: "rol", rol: e.target.value })}
                  aria-label={`Rol de ${u.nombre}`}
                  className="min-h-10 rounded-lg border border-borde bg-superficie px-2 text-sm"
                >
                  <option value="comercial">Comercial</option>
                  <option value="repartidor">Repartidor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={pendiente}
                  onClick={() => {
                    const nueva = prompt(`Nueva contraseña para ${u.nombre} (mínimo 8 caracteres):`, generarContrasena());
                    if (nueva) cambiar({ id: u.id, accion: "contrasena", contrasena: nueva.trim() });
                  }}
                  className="min-h-10 rounded-lg border border-borde px-3 text-sm font-medium"
                >
                  Cambiar contraseña
                </button>
              </div>
              {u.id !== yo && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={pendiente}
                    onClick={() => {
                      if (u.activo && !confirm(`¿Desactivar a ${u.nombre}? No podrá entrar en la app. Sus clientes siguen asignados hasta que los traspases.`)) return;
                      cambiar({ id: u.id, accion: u.activo ? "desactivar" : "activar" });
                    }}
                    className={cn("min-h-10 rounded-lg border px-3 text-sm font-medium", u.activo ? "border-red-300 text-red-700 dark:text-red-300" : "border-marca text-marca")}
                  >
                    {u.activo ? "Desactivar" : "Reactivar"}
                  </button>
                  {u.clientes > 0 && (
                    <select
                      defaultValue=""
                      disabled={pendiente}
                      onChange={(e) => {
                        const destino = activos.find((x) => x.id === e.target.value);
                        if (destino && confirm(`¿Pasar los ${u.clientes} clientes de ${u.nombre} a ${destino.nombre}?`)) cambiar({ id: u.id, accion: "traspasar", destino: destino.id });
                        e.target.value = "";
                      }}
                      aria-label={`Traspasar clientes de ${u.nombre}`}
                      className="min-h-10 rounded-lg border border-borde bg-superficie px-2 text-sm"
                    >
                      <option value="">Traspasar sus clientes a…</option>
                      {activos
                        .filter((x) => x.id !== u.id)
                        .map((x) => (
                          <option key={x.id} value={x.id}>
                            {x.nombre}
                          </option>
                        ))}
                    </select>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
