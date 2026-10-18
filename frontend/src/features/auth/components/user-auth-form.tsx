'use client';

import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LoadingButton } from '@/components/ui/loading-button';
import { FieldGroup } from '@/components/ui/field';
import { TextField } from '@/components/forms/fields/text-field';
import { useTransition } from 'react';
import { toast } from '@/lib/toast';
import * as z from 'zod';
import GithubSignInButton from './github-auth-button';

const formSchema = z.object({
  email: z.string().email({ message: 'Enter a valid email address' })
});

type FormValues = z.infer<typeof formSchema>;

export default function UserAuthForm() {
  const [loading, startTransition] = useTransition();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '' }
  });

  function onSubmit(_values: FormValues) {
    startTransition(() => {
      toast.success('Signed In Successfully!');
    });
  }

  return (
    <>
      <FormProvider {...form}>
        <form className='w-full space-y-2' onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            <TextField
              name='email'
              label='Email'
              type='email'
              placeholder='Enter your email...'
              disabled={loading}
            />
          </FieldGroup>
          <LoadingButton loading={loading} type='submit' className='mt-2 ml-auto w-full'>
            Continue With Email
          </LoadingButton>
        </form>
      </FormProvider>
      <div className='relative'>
        <div className='absolute inset-0 flex items-center'>
          <span className='w-full border-t' />
        </div>
        <div className='relative flex justify-center text-xs uppercase'>
          <span className='bg-background text-muted-foreground px-2'>Or continue with</span>
        </div>
      </div>
      <GithubSignInButton />
    </>
  );
}
