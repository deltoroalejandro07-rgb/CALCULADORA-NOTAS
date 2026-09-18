import { Card } from "@/components/ui";

export default function PlanGenerandoPage() {
  return (
    <main className="flex-1 flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-sm flex flex-col gap-3 text-center">
        <h1 className="text-2xl font-semibold">¡Ya tenemos tus datos!</h1>
        <p className="text-sm text-secondary">
          La generación de tu primer plan con IA llega en el siguiente paso
          del desarrollo.
        </p>
      </Card>
    </main>
  );
}
