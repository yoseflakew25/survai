'use client';

import * as React from 'react';
import { Controller } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { useFormField, type BaseFieldProps } from '@/lib/form-context';

/** Searchable select — Popover + Command per the shadcn combobox pattern. */
export function ComboboxField({
  name,
  label,
  description,
  required,
  options,
  placeholder = 'Select an option',
  searchPlaceholder = 'Search...',
  emptyMessage = 'No results found.'
}: BaseFieldProps & {
  options: { value: string; label: string; disabled?: boolean }[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
}) {
  const { control, isInvalid, errorMessage } = useFormField(name);
  const [open, setOpen] = React.useState(false);
  const listboxId = `${name}-listbox`;

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => {
        const selected = options.find((o) => o.value === field.value);
        return (
          <Field data-invalid={isInvalid}>
            <FieldLabel htmlFor={name}>
              {label}
              {required ? ' *' : null}
            </FieldLabel>
            <Popover
              open={open}
              onOpenChange={(next) => {
                setOpen(next);
                if (!next) field.onBlur();
              }}
            >
              <PopoverTrigger
                render={
                  <Button
                    id={name}
                    variant='outline'
                    role='combobox'
                    aria-controls={listboxId}
                    aria-expanded={open}
                    aria-invalid={isInvalid}
                    aria-describedby={isInvalid ? `${name}-error` : undefined}
                    className={cn(
                      'w-full justify-between font-normal',
                      !selected && 'text-muted-foreground'
                    )}
                  />
                }
              >
                {selected?.label ?? placeholder}
                <Icons.chevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
              </PopoverTrigger>
              <PopoverContent className='w-(--anchor-width) p-0'>
                <Command>
                  <CommandInput placeholder={searchPlaceholder} />
                  <CommandList id={listboxId}>
                    <CommandEmpty>{emptyMessage}</CommandEmpty>
                    <CommandGroup>
                      {options.map((opt) => (
                        <CommandItem
                          key={opt.value}
                          value={opt.value}
                          disabled={opt.disabled}
                          keywords={[opt.label]}
                          onSelect={(next) => {
                            field.onChange(next);
                            setOpen(false);
                          }}
                        >
                          <Icons.check
                            className={cn(
                              'mr-2 h-4 w-4',
                              field.value === opt.value ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                          {opt.label}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
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
