import { OptionCard } from "@/components/ui";
import { Category, IntakeDraft } from "../types";

const CATEGORIES: { value: Category; title: string; description: string }[] = [
  {
    value: "STRENGTH",
    title: "Ponerme en forma / ganar músculo",
    description: "Entrenamiento con pesas, a tu ritmo.",
  },
  {
    value: "HYROX",
    title: "Hyrox / reto híbrido",
    description: "Prepárate para una competición híbrida.",
  },
  {
    value: "RUNNING",
    title: "Prepararme para correr",
    description: "5k, 10k, media o maratón.",
  },
];

export function CategoryStep({
  draft,
  update,
}: {
  draft: IntakeDraft;
  update: (patch: Partial<IntakeDraft>) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {CATEGORIES.map((c) => (
        <OptionCard
          key={c.value}
          title={c.title}
          description={c.description}
          selected={draft.category === c.value}
          onClick={() => update({ category: c.value })}
        />
      ))}
    </div>
  );
}

export function isCategoryStepValid(draft: IntakeDraft) {
  return draft.category !== "";
}
