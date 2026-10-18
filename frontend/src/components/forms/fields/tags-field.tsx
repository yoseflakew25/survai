'use client';

import * as React from 'react';
import { Controller } from 'react-hook-form';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Icons } from '@/components/icons';
import { useFormField, type BaseFieldProps } from '@/lib/form-context';

/** Free-text tag list over a `string[]` value. Enter or Add pushes; badges remove. */
export function TagsField({
  name,
  label,
  description,
  required,
  placeholder = 'Type and press Enter...'
}: BaseFieldProps & { placeholder?: string }) {
  const { control, isInvalid, errorMessage } = useFormField(name);
  const [tagInput, setTagInput] = React.useState('');

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => {
        const values: string[] = field.value || [];

        const addTag = () => {
          const tag = tagInput.trim();
          if (tag && !values.includes(tag)) {
            field.onChange([...values, tag]);
            setTagInput('');
          }
        };

        return (
          <Field data-invalid={isInvalid}>
            <FieldLabel>
              {label}
              {required ? ' *' : null}
            </FieldLabel>
            <div className='flex gap-2'>
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder={placeholder}
                aria-label={`Add a ${label.toLowerCase().replace(/ \*$/, '')}`}
                aria-invalid={isInvalid}
                aria-describedby={isInvalid ? `${name}-error` : undefined}
              />
              <Button type='button' variant='secondary' onClick={addTag}>
                Add
              </Button>
            </div>
            {values.length > 0 ? (
              <div className='flex flex-wrap gap-2'>
                {values.map((tag) => (
                  <Badge key={tag} variant='secondary' className='gap-1'>
                    {tag}
                    <button
                      type='button'
                      onClick={() => field.onChange(values.filter((t) => t !== tag))}
                      aria-label={`Remove ${tag}`}
                      className='hover:text-destructive ml-0.5'
                    >
                      <Icons.close className='h-3 w-3' />
                    </button>
                  </Badge>
                ))}
              </div>
            ) : null}
            {description ? <FieldDescription>{description}</FieldDescription> : null}
            {isInvalid ? <FieldError id={`${name}-error`} errors={errorMessage} /> : null}
          </Field>
        );
      }}
    />
  );
}
