'use client';

import { Controller } from 'react-hook-form';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useFormField, type BaseFieldProps } from '@/lib/form-context';

/** Native color picker with a hex text input beside it. */
export function ColorField({ name, label, description }: Omit<BaseFieldProps, 'required'>) {
  const { control } = useFormField(name);

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <Field>
          <FieldLabel htmlFor={name}>{label}</FieldLabel>
          <div className='flex items-center gap-3'>
            <input
              id={name}
              aria-label={label}
              type='color'
              value={field.value ?? '#000000'}
              onChange={(e) => field.onChange(e.target.value)}
              className='h-9 w-12 cursor-pointer rounded-md border p-1'
            />
            <Input
              value={field.value ?? ''}
              onChange={(e) => field.onChange(e.target.value)}
              className='w-28 font-mono'
              placeholder='#000000'
              aria-label={`${label} hex value`}
            />
          </div>
          {description ? <FieldDescription>{description}</FieldDescription> : null}
        </Field>
      )}
    />
  );
}
