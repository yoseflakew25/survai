'use client';

/**
 * Forms use React Hook Form + Zod.
 *
 * Pattern:
 * ```tsx
 * const form = useForm({
 *   resolver: zodResolver(schema),
 *   defaultValues: { … }
 * });
 *
 * <FormProvider {...form}>
 *   <form onSubmit={form.handleSubmit(onSubmit)}>
 *     <TextField name='email' label='Email' type='email' required />
 *     <SubmitButton>Save</SubmitButton>
 *   </form>
 * </FormProvider>
 * ```
 *
 * Field components live in `@/components/forms/fields` and must be used
 * inside a `FormProvider`.
 */

export { SubmitButton } from '@/components/forms/submit-button';
