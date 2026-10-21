import Link from "next/link";

export default function NoEncontrado() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center px-6 text-center">
      <p className="text-5xl font-bold text-marca">404</p>
      <h1 className="mt-2 text-xl font-semibold">No encontrado</h1>
      <p className="mt-1 text-sm text-suave">No existe o no tienes acceso a esta página.</p>
      <Link href="/hoy" className="mt-6 rounded-xl bg-marca px-5 py-3 font-semibold text-marca-texto">
        Ir a Hoy
      </Link>
    </main>
  );
}
