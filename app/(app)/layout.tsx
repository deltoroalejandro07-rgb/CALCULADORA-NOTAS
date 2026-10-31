import { Suspense } from "react";
import { Barra, BarraInferior } from "@/components/app/barra-inferior";
import { Menu, MenuLateral } from "@/components/app/menu-lateral";
import { Sincronizador } from "@/components/app/sincronizador";
import { usuarioActual } from "@/lib/auth";

// Carcasa estática (se precarga y abre al instante); cada página trae
// sus datos de usuario dentro de su propio <Suspense>.
// Móvil: barra inferior. Ordenador (lg): menú lateral fijo y contenido más ancho.
export default function LayoutApp({ children }: LayoutProps<"/">) {
  return (
    <>
      <Sincronizador />
      <Suspense fallback={<Menu ruta={null} usuario={null} />}>
        <MenuConUsuario />
      </Suspense>
      <div className="lg:pl-64">
        <div className="pb-barra mx-auto min-h-dvh max-w-lg lg:max-w-5xl lg:px-4 lg:pb-12">{children}</div>
      </div>
      <Suspense fallback={<Barra ruta={null} />}>
        <BarraInferior />
      </Suspense>
    </>
  );
}

async function MenuConUsuario() {
  const u = await usuarioActual();
  return <MenuLateral usuario={{ nombre: u.nombre, rol: u.rol }} />;
}
