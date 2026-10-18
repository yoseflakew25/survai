import { useCallback, useState } from 'react';
import type { FieldValues, Path, SubmitHandler, UseFormReturn } from 'react-hook-form';
import type { ZodTypeAny } from 'zod';

type HandleCancelOrBackOpts = {
  onBack?: VoidFunction;
  onCancel?: VoidFunction;
};

type StepState = {
  value: number;
  count: number;
  goToNextStep: () => void;
  goToPrevStep: () => void;
  goToStep: (step: number) => void;
  isCompleted: boolean;
};

type UseFormStepperOptions = {
  /** When provided, the final submit re-validates the whole form. */
  fullSchema?: ZodTypeAny;
};

function applyZodIssues<T extends FieldValues>(
  form: UseFormReturn<T>,
  issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }>
) {
  for (const issue of issues) {
    const path = issue.path
      .reduce<string>(
        (acc, seg) =>
          typeof seg === 'number' ? `${acc}[${seg}]` : acc ? `${acc}.${String(seg)}` : String(seg),
        ''
      )
      .replace(/\[(\d+)\]/g, '.$1');

    if (!path) continue;
    form.setError(path as Path<T>, { type: 'manual', message: issue.message });
  }
}

/**
 * Hook for multi-step form navigation and Zod validation with React Hook Form.
 */
export function useFormStepper(schemas: ZodTypeAny[], options?: UseFormStepperOptions) {
  const stepCount = schemas.length;
  const [currentStep, setCurrentStep] = useState(1);

  const goToNextStep = useCallback(() => {
    setCurrentStep((prev) => Math.min(prev + 1, stepCount));
  }, [stepCount]);

  const goToPrevStep = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  }, []);

  const goToStep = useCallback(
    (step: number) => {
      setCurrentStep(Math.min(Math.max(step, 1), stepCount));
    },
    [stepCount]
  );

  const step: StepState = {
    value: currentStep,
    count: stepCount,
    goToNextStep,
    goToPrevStep,
    goToStep,
    isCompleted: currentStep === stepCount
  };

  const currentValidator = schemas[currentStep - 1];
  const isFirstStep = currentStep === 1;

  const triggerFormGroup = async <T extends FieldValues>(form: UseFormReturn<T>) => {
    const values = form.getValues();
    const result = currentValidator.safeParse(values);
    if (!result.success) {
      applyZodIssues(form, result.error.issues);
      return { ...result, success: false as const };
    }
    return result;
  };

  const handleNextStepOrSubmit = async <T extends FieldValues>(
    form: UseFormReturn<T>,
    onFinalSubmit?: SubmitHandler<T>
  ) => {
    const result = await triggerFormGroup(form);
    if (!result.success) {
      return;
    }

    if (currentStep < stepCount) {
      goToNextStep();
      return;
    }

    if (options?.fullSchema) {
      const full = options.fullSchema.safeParse(form.getValues());
      if (!full.success) {
        const failing = schemas.findIndex((s) => !s.safeParse(form.getValues()).success);
        if (failing >= 0) {
          goToStep(failing + 1);
        }
        applyZodIssues(form, full.error.issues);
        return;
      }
    }

    if (onFinalSubmit) {
      await form.handleSubmit(onFinalSubmit)();
    }
  };

  const handleCancelOrBack = (opts?: HandleCancelOrBackOpts) => {
    if (currentStep > 1) {
      opts?.onBack?.();
      goToPrevStep();
      return;
    }
    opts?.onCancel?.();
  };

  return {
    step,
    currentStep,
    isFirstStep,
    currentValidator,
    triggerFormGroup,
    handleNextStepOrSubmit,
    handleCancelOrBack
  };
}
