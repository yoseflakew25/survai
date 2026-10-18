'use client';

import { Controller } from 'react-hook-form';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel
} from '@/components/ui/field';
import { useFormField, type BaseFieldProps } from '@/lib/form-context';

/** Single boolean checkbox (terms, consent, …). */
export function CheckboxField({ name, label, description, required }: BaseFieldProps) {
  const { control, isInvalid, errorMessage } = useFormField(name);

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <Field orientation='horizontal' data-invalid={isInvalid}>
          <Checkbox
            id={name}
            name={field.name}
            checked={field.value}
            onCheckedChange={(checked) => field.onChange(checked === true)}
            aria-invalid={isInvalid}
            aria-describedby={isInvalid ? `${name}-error` : undefined}
          />
          <FieldContent>
            <FieldLabel htmlFor={name} className='font-normal'>
              {label}
              {required ? ' *' : null}
            </FieldLabel>
            {description ? <FieldDescription>{description}</FieldDescription> : null}
            {isInvalid ? <FieldError id={`${name}-error`} errors={errorMessage} /> : null}
          </FieldContent>
        </Field>
      )}
    />
  );
}
