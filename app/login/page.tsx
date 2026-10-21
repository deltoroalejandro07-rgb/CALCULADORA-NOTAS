import type { Metadata } from "next";
import { Suspense } from "react";
import { FormularioLogin } from "./formulario";

export const metadata: Metadata = { title: "Entrar" };

export default function PaginaLogin() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 py-10">
      <div className="mb-8 flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon.svg" alt="" className="h-12 w-12" />
        <div>
          <h1 className="text-2xl font-bold">CRM HORECA</h1>
          <p className="text-sm text-suave">Visitas, clientes y ofertas</p>
        </div>
      </div>
      <Suspense>
        <FormularioLogin />
      </Suspense>
    </main>
  );
}
