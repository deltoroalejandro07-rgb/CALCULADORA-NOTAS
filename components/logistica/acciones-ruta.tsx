"use client";

import { Printer, Trash2 } from "lucide-react";
import { borrarRuta } from "@/app/(app)/logistica/acciones";
import { Boton } from "@/components/ui/boton";

export function BorrarRuta({ id }: { id: string }) {
  return (
    <form
      action={borrarRuta}
      onSubmit={(e) => {
        if (!confirm("¿Borrar esta ruta? Se borra también lo registrado en ella (entregas). Sus albaranes vuelven a «por repartir».")) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <Boton type="submit" variante="secundario" className="w-full text-red-600">
        <Trash2 className="h-5 w-5" aria-hidden /> Borrar ruta
      </Boton>
    </form>
  );
}

export function BotonImprimir({ texto = "Imprimir o guardar en PDF" }: { texto?: string }) {
  return (
    <Boton type="button" className="w-full print:hidden" onClick={() => window.print()}>
      <Printer className="h-5 w-5" aria-hidden /> {texto}
    </Boton>
  );
}

/** Al imprimir: sin barra inferior ni enlaces de navegación, fondo blanco. */
export function EstiloImpresion() {
  return <style>{`@media print { nav, .no-imprimir { display: none !important; } body { background: #fff !important; color: #000 !important; } .pb-barra { padding-bottom: 0 !important; } }`}</style>;
}
