import { Button, Card, Field, Input } from "@/components/ui";
import { requestMagicLink } from "@/lib/actions/auth";
import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="flex-1 flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-sm flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold">Inicia sesión</h1>
          <p className="text-sm text-secondary">
            Te enviamos un enlace de acceso a tu email.
          </p>
        </div>
        <form action={requestMagicLink} className="flex flex-col gap-4">
          <Field label="Email">
            <Input
              type="email"
              name="email"
              placeholder="tu@email.com"
              required
              autoFocus
            />
          </Field>
          <Button type="submit" className="w-full">
            Recibir enlace de acceso
          </Button>
        </form>
        <p className="text-xs text-secondary text-center">
          ¿Aún no tienes cuenta?{" "}
          <Link href="/registro" className="text-accent-blue">
            Regístrate
          </Link>
        </p>
      </Card>
    </main>
  );
}
