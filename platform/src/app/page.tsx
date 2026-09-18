import Link from "next/link";
import { Button } from "@/components/ui";

export default function Home() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 py-20 gap-6 text-center">
      <h1 className="text-4xl font-semibold max-w-lg">
        Tu plan de entrenamiento, ajustado cada mes con IA
      </h1>
      <p className="text-secondary max-w-md">
        Pesas, Hyrox o carrera. Tu primer plan del mes es gratis.
      </p>
      <Link href="/registro">
        <Button>Empezar gratis</Button>
      </Link>
    </main>
  );
}
