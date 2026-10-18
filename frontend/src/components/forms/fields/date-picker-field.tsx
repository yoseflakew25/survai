'use client';

import { Controller } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { useFormField, type BaseFieldProps } from '@/lib/form-context';

/** Single date — Popover + Calendar per the shadcn date-picker pattern. */
export function DatePickerField({
  name,
  label,
  description,
  required,
  placeholder = 'Pick a date',
  disabledDates
}: BaseFieldProps & {
  placeholder?: string;
  disabledDates?: (date: Date) => boolean;
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
          <Popover>
            <PopoverTrigger
              render={
                <Button
                  id={name}
                  variant='outline'
                  aria-invalid={isInvalid}
                  aria-describedby={isInvalid ? `${name}-error` : undefined}
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !field.value && 'text-muted-foreground'
                  )}
                />
              }
            >
              <Icons.calendar className='mr-2 h-4 w-4' />
              {field.value ? format(field.value, 'PPP') : <span>{placeholder}</span>}
            </PopoverTrigger>
            <PopoverContent className='w-auto p-0' align='start'>
              <Calendar
                mode='single'
                selected={field.value}
                onSelect={(date) => field.onChange(date)}
                disabled={disabledDates}
                autoFocus
              />
            </PopoverContent>
          </Popover>
          {description ? <FieldDescription>{description}</FieldDescription> : null}
          {isInvalid ? <FieldError id={`${name}-error`} errors={errorMessage} /> : null}
        </Field>
      )}
    />
  );
}

/** Date range — two-month Calendar in range mode. */
export function DateRangeField({
  name,
  label,
  description,
  required,
  placeholder = 'Pick a date range'
}: BaseFieldProps & { placeholder?: string }) {
  const { control, isInvalid, errorMessage } = useFormField(name);

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => {
        const range = field.value as DateRange | undefined;
        return (
          <Field data-invalid={isInvalid}>
            <FieldLabel htmlFor={name}>
              {label}
              {required ? ' *' : null}
            </FieldLabel>
            <Popover>
              <PopoverTrigger
                render={
                  <Button
                    id={name}
                    variant='outline'
                    aria-invalid={isInvalid}
                    aria-describedby={isInvalid ? `${name}-error` : undefined}
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !range?.from && 'text-muted-foreground'
                    )}
                  />
                }
              >
                <Icons.calendar className='mr-2 h-4 w-4' />
                {range?.from ? (
                  range.to ? (
                    <>
                      {format(range.from, 'LLL dd, y')} - {format(range.to, 'LLL dd, y')}
                    </>
                  ) : (
                    format(range.from, 'LLL dd, y')
                  )
                ) : (
                  <span>{placeholder}</span>
                )}
              </PopoverTrigger>
              <PopoverContent className='w-auto p-0' align='start'>
                <Calendar
                  mode='range'
                  selected={range}
                  onSelect={field.onChange}
                  numberOfMonths={2}
                  autoFocus
                />
              </PopoverContent>
            </Popover>
            {description ? <FieldDescription>{description}</FieldDescription> : null}
            {isInvalid ? <FieldError id={`${name}-error`} errors={errorMessage} /> : null}
          </Field>
        );
      }}
    />
  );
}
