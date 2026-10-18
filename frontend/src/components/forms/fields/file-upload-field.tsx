'use client';

import { Controller } from 'react-hook-form';
import { FileUploader } from '@/components/file-uploader';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { useFormField, type BaseFieldProps } from '@/lib/form-context';

export function FileUploadField({
  name,
  label,
  description,
  required,
  maxSize = 5 * 1024 * 1024,
  maxFiles = 1
}: BaseFieldProps & {
  maxSize?: number;
  maxFiles?: number;
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
          <FileUploader
            value={field.value}
            onValueChange={(files) =>
              field.onChange(typeof files === 'function' ? files(field.value ?? []) : files)
            }
            maxSize={maxSize}
            maxFiles={maxFiles}
          />
          {description ? <FieldDescription>{description}</FieldDescription> : null}
          {isInvalid ? <FieldError id={`${name}-error`} errors={errorMessage} /> : null}
        </Field>
      )}
    />
  );
}
