'use client';

import { Controller } from 'react-hook-form';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Slider } from '@/components/ui/slider';
import { useFormField, type BaseFieldProps } from '@/lib/form-context';

export function SliderField({
  name,
  label,
  description,
  min = 0,
  max = 100,
  step = 1
}: Omit<BaseFieldProps, 'required'> & {
  min?: number;
  max?: number;
  step?: number;
}) {
  const { control } = useFormField(name);
  const labelId = `${name}-label`;

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <Field>
          <FieldLabel id={labelId}>{label}</FieldLabel>
          <div className='px-1'>
            <Slider
              min={min}
              max={max}
              step={step}
              value={[field.value]}
              onValueChange={(v) => field.onChange(Array.isArray(v) ? v[0] : v)}
              onBlur={field.onBlur}
              aria-labelledby={labelId}
            />
            <div className='text-muted-foreground mt-1 flex justify-between text-xs tabular-nums'>
              <span>{min}</span>
              <span className='text-foreground font-medium'>{field.value}</span>
              <span>{max}</span>
            </div>
          </div>
          {description ? <FieldDescription>{description}</FieldDescription> : null}
        </Field>
      )}
    />
  );
}
