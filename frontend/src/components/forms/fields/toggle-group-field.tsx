'use client';

import * as React from 'react';
import { Controller } from 'react-hook-form';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { ToggleGroup } from '@/components/ui/toggle-group';
import { useFormField, type BaseFieldProps } from '@/lib/form-context';

/**
 * Multi-select toggle group over a `string[]` value. Pass `ToggleGroupItem`s
 * as children.
 */
export function ToggleGroupField({
  name,
  label,
  description,
  children
}: Omit<BaseFieldProps, 'required'> & { children: React.ReactNode }) {
  const { control } = useFormField(name);
  const labelId = `${name}-label`;

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <Field>
          <FieldLabel id={labelId}>{label}</FieldLabel>
          <ToggleGroup
            multiple
            variant='outline'
            aria-labelledby={labelId}
            value={field.value || []}
            onValueChange={(val) => field.onChange(val)}
          >
            {children}
          </ToggleGroup>
          {description ? <FieldDescription>{description}</FieldDescription> : null}
        </Field>
      )}
    />
  );
}
