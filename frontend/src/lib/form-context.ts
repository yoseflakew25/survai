'use client';

import { useFormContext, type FieldError as RHFFieldError } from 'react-hook-form';

/** Props every field component shares. `name` binds the field to RHF. */
export type BaseFieldProps = {
  name: string;
  label: string;
  description?: string;
  /** Appends ' *' to the label. Purely visual — rules live in the schema. */
  required?: boolean;
};

function getPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc == null || typeof acc !== 'object') return undefined;
    return (acc as Record<string, unknown>)[key];
  }, obj);
}

/**
 * Shared field state for RHF + FormProvider. Errors show after the field is
 * touched or the form has been submitted.
 */
export function useFormField(name: string) {
  const {
    control,
    formState: { errors, touchedFields, dirtyFields, isSubmitted, isSubmitting }
  } = useFormContext();

  const error = getPath(errors, name) as RHFFieldError | undefined;
  const touched = !!getPath(touchedFields, name);
  const dirty = !!getPath(dirtyFields, name);
  const isInvalid = !!error && (touched || dirty || isSubmitted);
  const errorMessage = error?.message
    ? [{ message: String(error.message) }]
    : undefined;

  return {
    control,
    name,
    isInvalid,
    errorMessage,
    isSubmitting
  };
}
