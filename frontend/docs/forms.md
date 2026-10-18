# Forms

SurvAI forms use **React Hook Form + Zod**.

## Pattern

```tsx
'use client';

import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { TextField } from '@/components/forms/fields/text-field';
import { SubmitButton } from '@/components/forms/submit-button';

const schema = z.object({
  email: z.string().email('Enter a valid email')
});

type Values = z.infer<typeof schema>;

export function ExampleForm() {
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' }
  });

  function onSubmit(values: Values) {
    // mutate / navigate
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <TextField name='email' label='Email' type='email' required />
        <SubmitButton>Save</SubmitButton>
      </form>
    </FormProvider>
  );
}
```

## Layout

| Path | Role |
| --- | --- |
| `src/lib/form-context.ts` | `useFormField`, `BaseFieldProps` |
| `src/components/forms/fields/*` | Field widgets (must sit inside `FormProvider`) |
| `src/components/forms/submit-button.tsx` | Submit with loading from `formState.isSubmitting` |

## Rules

- Validate with Zod + `zodResolver` — do not hand-roll field validators for schema rules
- Put fields inside `FormProvider {...form}`
- Prefer shared field components for consistency; use `register` / `Controller` for one-offs
- Multi-step: `useFormStepper` in `src/hooks/use-stepper.tsx` + per-step Zod schemas
