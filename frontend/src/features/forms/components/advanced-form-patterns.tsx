'use client';

import { useEffect, useRef } from 'react';
import { FormProvider, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Icons } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/lib/toast';
import { TextField } from '@/components/forms/fields/text-field';
import { SelectField } from '@/components/forms/fields/select-field';
import { SubmitButton } from '@/components/forms/submit-button';

type AdvancedFormValues = {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  team: {
    name: string;
    size: number;
  };
  members: Array<{ name: string; role: string }>;
  country: string;
  state: string;
};

const countryStateMap: Record<string, { value: string; label: string }[]> = {
  us: [
    { value: 'ca', label: 'California' },
    { value: 'ny', label: 'New York' },
    { value: 'tx', label: 'Texas' }
  ],
  uk: [
    { value: 'ldn', label: 'London' },
    { value: 'mnc', label: 'Manchester' },
    { value: 'brm', label: 'Birmingham' }
  ],
  au: [
    { value: 'nsw', label: 'New South Wales' },
    { value: 'vic', label: 'Victoria' },
    { value: 'qld', label: 'Queensland' }
  ]
};

const countryOptions = [
  { value: 'us', label: 'United States' },
  { value: 'uk', label: 'United Kingdom' },
  { value: 'au', label: 'Australia' }
];

const advancedSchema = z
  .object({
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .refine((v) => v !== 'admin' && v !== 'test', 'Username is taken'),
    email: z.string().email('Invalid email'),
    password: z.string().min(8, 'Must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    team: z.object({
      name: z.string().min(2, 'Team name must be at least 2 characters'),
      size: z.number().min(1, 'At least 1 member').max(100, 'Max 100 members')
    }),
    members: z
      .array(
        z.object({
          name: z.string().min(1, 'Member name is required'),
          role: z.string().min(1, 'Role is required')
        })
      )
      .min(1, 'Add at least one member'),
    country: z.string().min(1, 'Select a country'),
    state: z.string().min(1, 'Select a state')
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  });

export default function AdvancedFormPatterns() {
  const form = useForm<AdvancedFormValues>({
    resolver: zodResolver(advancedSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      team: {
        name: '',
        size: 1
      },
      members: [{ name: '', role: '' }],
      country: '',
      state: ''
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'members'
  });

  const selectedCountry = useWatch({ control: form.control, name: 'country' });
  const members = useWatch({ control: form.control, name: 'members' }) ?? [];
  const stateOptions = countryStateMap[selectedCountry] ?? [];
  const prevCountry = useRef(selectedCountry);

  useEffect(() => {
    if (prevCountry.current !== selectedCountry) {
      prevCountry.current = selectedCountry;
      form.setValue('state', '');
    }
  }, [selectedCountry, form]);

  function onSubmit() {
    toast.success('Team registered successfully!');
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className='text-2xl font-bold'>Team Registration</CardTitle>
        <p className='text-muted-foreground'>
          Demonstrates linked fields, nested objects, dynamic arrays, and dependent selects.
        </p>
      </CardHeader>
      <CardContent>
        <FormProvider {...form}>
          <form className='space-y-6' onSubmit={form.handleSubmit(onSubmit)}>
            <div className='space-y-1'>
              <h3 className='text-lg font-semibold'>Account</h3>
              <p className='text-muted-foreground text-sm'>Linked fields + Zod refinements</p>
            </div>

            <FieldGroup className='grid grid-cols-1 gap-4 md:grid-cols-2'>
              <TextField name='username' label='Username' required placeholder='Choose a username' />
              <TextField
                name='email'
                label='Email'
                required
                type='email'
                placeholder='you@example.com'
              />
              <TextField
                name='password'
                label='Password'
                required
                type='password'
                placeholder='Min 8 characters'
              />
              <TextField
                name='confirmPassword'
                label='Confirm Password'
                required
                type='password'
                placeholder='Confirm password'
              />
            </FieldGroup>

            <Separator />

            <div className='space-y-1'>
              <h3 className='text-lg font-semibold'>Team Info</h3>
              <p className='text-muted-foreground text-sm'>Nested objects with dot-notation paths</p>
            </div>

            <FieldGroup className='grid grid-cols-1 gap-4 md:grid-cols-2'>
              <TextField
                name='team.name'
                label='Team Name'
                required
                placeholder='e.g. Alpha Squad'
              />
              <TextField
                name='team.size'
                label='Team Size'
                required
                type='number'
                min={1}
                max={100}
                placeholder='1-100'
              />
            </FieldGroup>

            <Separator />

            <div className='space-y-1'>
              <h3 className='text-lg font-semibold'>Members</h3>
              <p className='text-muted-foreground text-sm'>Dynamic array rows with add / remove</p>
            </div>

            <div className='space-y-3'>
              {fields.map((member, i) => {
                const nameError = form.formState.errors.members?.[i]?.name;
                const roleError = form.formState.errors.members?.[i]?.role;
                return (
                  <div key={member.id} className='flex items-start gap-2'>
                    <Field className='flex-1' data-invalid={!!nameError}>
                      <Input
                        id={`member-name-${i}`}
                        placeholder='Member name'
                        aria-label={`Member ${i + 1} name`}
                        aria-invalid={!!nameError}
                        {...form.register(`members.${i}.name`)}
                      />
                      {nameError ? (
                        <FieldError id={`member-name-${i}-error`}>
                          {nameError.message}
                        </FieldError>
                      ) : null}
                    </Field>
                    <Field className='flex-1' data-invalid={!!roleError}>
                      <Input
                        id={`member-role-${i}`}
                        placeholder='Role'
                        aria-label={`Member ${i + 1} role`}
                        aria-invalid={!!roleError}
                        {...form.register(`members.${i}.role`)}
                      />
                      {roleError ? (
                        <FieldError id={`member-role-${i}-error`}>
                          {roleError.message}
                        </FieldError>
                      ) : null}
                    </Field>
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      onClick={() => remove(i)}
                      aria-label={`Remove member ${i + 1}`}
                    >
                      <Icons.close className='h-4 w-4' />
                    </Button>
                  </div>
                );
              })}
              <Button
                type='button'
                variant='outline'
                onClick={() => append({ name: '', role: '' })}
              >
                <Icons.add className='mr-2 h-4 w-4' /> Add Member
              </Button>
              {members.filter((m) => m.name).length > 0 ? (
                <div className='flex flex-wrap gap-1'>
                  {members
                    .filter((m) => m.name)
                    .map((m, idx) => (
                      <Badge key={idx} variant='secondary'>
                        {m.name}
                        {m.role ? ` (${m.role})` : ''}
                      </Badge>
                    ))}
                </div>
              ) : null}
            </div>

            <Separator />

            <div className='space-y-1'>
              <h3 className='text-lg font-semibold'>Preferences</h3>
              <p className='text-muted-foreground text-sm'>
                Dependent select — country resets state
              </p>
            </div>

            <FieldGroup className='grid grid-cols-1 gap-4 md:grid-cols-2'>
              <SelectField
                name='country'
                label='Country'
                required
                options={countryOptions}
                placeholder='Select a country'
              />
              <SelectField
                name='state'
                label='State / Region'
                required
                options={stateOptions}
                placeholder={selectedCountry ? 'Select state' : 'Select a country first'}
              />
            </FieldGroup>

            <Separator />

            <div className='flex gap-4 pt-2'>
              <Button type='button' variant='outline' onClick={() => form.reset()} className='flex-1'>
                Reset
              </Button>
              <SubmitButton className='flex-1'>Register Team</SubmitButton>
            </div>
          </form>
        </FormProvider>
      </CardContent>
    </Card>
  );
}
