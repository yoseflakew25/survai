'use client';

import { Controller } from 'react-hook-form';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { useFormField, type BaseFieldProps } from '@/lib/form-context';

export function SelectField({
  name,
  label,
  description,
  required,
  placeholder = 'Select',
  options
}: BaseFieldProps & {
  placeholder?: string;
  options: { value: string; label: string; disabled?: boolean }[];
}) {
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
          <Select
            name={field.name}
            value={field.value}
            onValueChange={(value) => field.onChange(value ?? '')}
          >
            <SelectTrigger
              id={name}
              aria-invalid={isInvalid}
              aria-describedby={isInvalid ? `${name}-error` : undefined}
            >
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {options.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} disabled={opt.disabled}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          {description ? <FieldDescription>{description}</FieldDescription> : null}
          {isInvalid ? <FieldError id={`${name}-error`} errors={errorMessage} /> : null}
        </Field>
      )}
    />
  );
}
