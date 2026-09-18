import { Card } from "@/components/ui";

export default function VerificarEmailPage() {
  return (
    <main className="flex-1 flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-sm flex flex-col gap-3 text-center">
        <h1 className="text-2xl font-semibold">Revisa tu email</h1>
        <p className="text-sm text-secondary">
          Te hemos enviado un enlace para entrar. Ábrelo desde este mismo
          dispositivo para continuar.
        </p>
      </Card>
    </main>
  );
}
