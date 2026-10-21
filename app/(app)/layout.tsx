import { BarraInferior } from "@/components/app/barra-inferior";
import { Sincronizador } from "@/components/app/sincronizador";

// Carcasa estática (se precarga y abre al instante); cada página trae
// sus datos de usuario dentro de su propio <Suspense>.
export default function LayoutApp({ children }: LayoutProps<"/">) {
  return (
    <>
      <Sincronizador />
      <div className="pb-barra mx-auto min-h-dvh max-w-lg">{children}</div>
      <BarraInferior />
    </>
  );
}
