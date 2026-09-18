import { ReactNode } from "react";
import { Button, ProgressBar } from "@/components/ui";

export function StepShell({
  step,
  totalSteps,
  title,
  subtitle,
  onBack,
  onNext,
  nextLabel = "Continuar",
  nextDisabled,
  children,
}: {
  step: number;
  totalSteps: number;
  title: string;
  subtitle?: string;
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="w-full max-w-lg flex flex-col gap-6">
      <ProgressBar value={(step / totalSteps) * 100} />
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">{title}</h1>
        {subtitle && <p className="text-sm text-secondary">{subtitle}</p>}
      </div>
      <div className="flex flex-col gap-4">{children}</div>
      <div className="flex items-center gap-3 pt-2">
        {onBack && (
          <Button type="button" variant="ghost" onClick={onBack}>
            Atrás
          </Button>
        )}
        <Button
          type="button"
          onClick={onNext}
          disabled={nextDisabled}
          className="flex-1"
        >
          {nextLabel}
        </Button>
      </div>
    </div>
  );
}
