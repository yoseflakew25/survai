'use client';

import * as React from 'react';
import { Controller } from 'react-hook-form';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { useFormField, type BaseFieldProps } from '@/lib/form-context';

export function TextareaField({
  name,
  label,
  description,
  required,
  showCount,
  ...textareaProps
}: BaseFieldProps & {
  /** Show a character counter (uses `maxLength` as the denominator). */
  showCount?: boolean;
} & Omit<React.ComponentProps<typeof Textarea>, 'name' | 'value' | 'onChange' | 'onBlur'>) {
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
          <Textarea
            id={name}
            {...textareaProps}
            name={field.name}
            ref={field.ref}
            value={field.value ?? ''}
            onBlur={field.onBlur}
            onChange={field.onChange}
            aria-invalid={isInvalid}
            aria-describedby={isInvalid ? `${name}-error` : undefined}
          />
          {showCount && textareaProps.maxLength ? (
            <div className='text-muted-foreground text-right text-sm'>
              {field.value?.length || 0} / {textareaProps.maxLength}
            </div>
          ) : null}
          {description ? <FieldDescription>{description}</FieldDescription> : null}
          {isInvalid ? <FieldError id={`${name}-error`} errors={errorMessage} /> : null}
        </Field>
      )}
    />
  );
}
