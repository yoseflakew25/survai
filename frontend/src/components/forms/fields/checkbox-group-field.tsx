'use client';

import { Controller } from 'react-hook-form';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet
} from '@/components/ui/field';
import { cn } from '@/lib/utils';
import { useFormField, type BaseFieldProps } from '@/lib/form-context';

/** Multi-select checkbox group over a `string[]` value. */
export function CheckboxGroupField({
  name,
  label,
  description,
  required,
  options,
  className
}: BaseFieldProps & {
  options: { value: string; label: string; disabled?: boolean }[];
  /** Layout for the option grid, e.g. 'grid grid-cols-2 gap-3'. */
  className?: string;
}) {
  const { control, isInvalid, errorMessage } = useFormField(name);

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => {
        const values: string[] = field.value || [];
        return (
          <FieldSet>
            <FieldLegend variant='label'>
              {label}
              {required ? ' *' : null}
            </FieldLegend>
            {description ? <FieldDescription>{description}</FieldDescription> : null}
            <FieldGroup data-slot='checkbox-group' className={cn('gap-3', className)}>
              {options.map((opt) => (
                <Field key={opt.value} orientation='horizontal' data-invalid={isInvalid}>
                  <Checkbox
                    id={`${name}-${opt.value}`}
                    name={name}
                    disabled={opt.disabled}
                    aria-invalid={isInvalid}
                    aria-describedby={isInvalid ? `${name}-error` : undefined}
                    checked={values.includes(opt.value)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        field.onChange([...values, opt.value]);
                      } else {
                        field.onChange(values.filter((v) => v !== opt.value));
                      }
                    }}
                  />
                  <FieldLabel htmlFor={`${name}-${opt.value}`} className='font-normal'>
                    {opt.label}
                  </FieldLabel>
                </Field>
              ))}
            </FieldGroup>
            {isInvalid ? <FieldError id={`${name}-error`} errors={errorMessage} /> : null}
          </FieldSet>
        );
      }}
    />
  );
}
