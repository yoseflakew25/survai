'use client';

import { Controller } from 'react-hook-form';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldLegend,
  FieldSet
} from '@/components/ui/field';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useFormField, type BaseFieldProps } from '@/lib/form-context';

export function RadioGroupField({
  name,
  label,
  description,
  required,
  options
}: BaseFieldProps & {
  options: { value: string; label: string; disabled?: boolean }[];
}) {
  const { control, isInvalid, errorMessage } = useFormField(name);

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <FieldSet>
          <FieldLegend variant='label'>
            {label}
            {required ? ' *' : null}
          </FieldLegend>
          {description ? <FieldDescription>{description}</FieldDescription> : null}
          <RadioGroup
            name={field.name}
            value={field.value}
            onValueChange={field.onChange}
            onBlur={field.onBlur}
            className='flex flex-wrap gap-x-6 gap-y-2'
          >
            {options.map((opt) => (
              <Field
                key={opt.value}
                orientation='horizontal'
                data-invalid={isInvalid}
                className='w-auto'
              >
                <RadioGroupItem
                  value={opt.value}
                  id={`${name}-${opt.value}`}
                  disabled={opt.disabled}
                  aria-invalid={isInvalid}
                  aria-describedby={isInvalid ? `${name}-error` : undefined}
                />
                <FieldLabel htmlFor={`${name}-${opt.value}`} className='font-normal'>
                  {opt.label}
                </FieldLabel>
              </Field>
            ))}
          </RadioGroup>
          {isInvalid ? <FieldError id={`${name}-error`} errors={errorMessage} /> : null}
        </FieldSet>
      )}
    />
  );
}
