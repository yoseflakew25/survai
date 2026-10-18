'use client';

import { Controller } from 'react-hook-form';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel
} from '@/components/ui/field';
import { Switch } from '@/components/ui/switch';
import { useFormField, type BaseFieldProps } from '@/lib/form-context';

export function SwitchField({ name, label, description, required }: BaseFieldProps) {
  const { control, isInvalid, errorMessage } = useFormField(name);

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <Field orientation='horizontal' data-invalid={isInvalid}>
          <FieldContent>
            <FieldLabel htmlFor={name}>
              {label}
              {required ? ' *' : null}
            </FieldLabel>
            {description ? <FieldDescription>{description}</FieldDescription> : null}
            {isInvalid ? <FieldError id={`${name}-error`} errors={errorMessage} /> : null}
          </FieldContent>
          <Switch
            id={name}
            name={field.name}
            checked={field.value}
            onCheckedChange={field.onChange}
            aria-invalid={isInvalid}
            aria-describedby={isInvalid ? `${name}-error` : undefined}
          />
        </Field>
      )}
    />
  );
}
