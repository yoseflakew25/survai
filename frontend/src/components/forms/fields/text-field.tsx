'use client';

import * as React from 'react';
import { Controller } from 'react-hook-form';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useFormField, type BaseFieldProps } from '@/lib/form-context';

/**
 * Text-style input (text, email, password, tel, url, time, number).
 * For `type='number'` clearing writes `undefined` so a required
 * `z.number({ error: '…' })` reports a human message instead of a type error.
 */
export function TextField({
  name,
  label,
  description,
  required,
  ...inputProps
}: BaseFieldProps & Omit<React.ComponentProps<typeof Input>, 'name' | 'value' | 'onChange' | 'onBlur'>) {
  const { control, isInvalid, errorMessage } = useFormField(name);

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <Field data-invalid={isInvalid}>
          <FieldLabel htmlFor={name}>
            {label}
            {required ? ' *' : null}
          </FieldLabel>
          <Input
            id={name}
            {...inputProps}
            name={field.name}
            ref={field.ref}
            value={field.value ?? ''}
            onBlur={field.onBlur}
            onChange={(e) =>
              field.onChange(
                inputProps.type === 'number'
                  ? e.target.value === ''
                    ? undefined
                    : Number(e.target.value)
                  : e.target.value
              )
            }
            aria-invalid={isInvalid}
            aria-describedby={isInvalid ? `${name}-error` : undefined}
          />
          {description ? <FieldDescription>{description}</FieldDescription> : null}
          {isInvalid ? <FieldError id={`${name}-error`} errors={errorMessage} /> : null}
        </Field>
      )}
    />
  );
}
