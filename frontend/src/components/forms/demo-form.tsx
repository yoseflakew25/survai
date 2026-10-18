'use client';

import * as React from 'react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FieldGroup } from '@/components/ui/field';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ToggleGroupItem } from '@/components/ui/toggle-group';
import type { DateRange } from 'react-day-picker';
import { Icons } from '@/components/icons';
import { TextField } from '@/components/forms/fields/text-field';
import { TextareaField } from '@/components/forms/fields/textarea-field';
import { SelectField } from '@/components/forms/fields/select-field';
import { ComboboxField } from '@/components/forms/fields/combobox-field';
import { CheckboxGroupField } from '@/components/forms/fields/checkbox-group-field';
import { RadioGroupField } from '@/components/forms/fields/radio-group-field';
import { SwitchField } from '@/components/forms/fields/switch-field';
import { ToggleGroupField } from '@/components/forms/fields/toggle-group-field';
import { CheckboxField } from '@/components/forms/fields/checkbox-field';
import { SliderField } from '@/components/forms/fields/slider-field';
import { DatePickerField, DateRangeField } from '@/components/forms/fields/date-picker-field';
import { OtpField } from '@/components/forms/fields/otp-field';
import { ColorField } from '@/components/forms/fields/color-field';
import { TagsField } from '@/components/forms/fields/tags-field';
import { FileUploadField } from '@/components/forms/fields/file-upload-field';
import { SubmitButton } from '@/components/forms/submit-button';

const demoFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z
    .email('Invalid email address')
    .refine((v) => v !== 'taken@example.com', 'This email is already registered'),
  age: z.number({ error: 'Age is required' }).min(18, 'Must be at least 18 years old'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  phone: z.string().min(10, 'Phone must be at least 10 digits'),
  website: z.string().url('Invalid URL').or(z.literal('')),
  bio: z.string().min(10, 'Bio must be at least 10 characters'),
  country: z.string().min(1, 'Please select a country'),
  framework: z.string().min(1, 'Please select a framework'),
  interests: z.array(z.string()).min(1, 'Select at least one interest'),
  gender: z.string().min(1, 'Please select gender'),
  newsletter: z.boolean(),
  rating: z.number().min(0).max(10),
  birthDate: z.date().optional(),
  dateRange: z.any().optional(),
  eventTime: z.string().optional(),
  favoriteColor: z.string().optional(),
  otp: z.string().min(6, 'Please enter 6 digits'),
  formatting: z.array(z.string()).optional(),
  tags: z.array(z.string()).min(1, 'Add at least one tag'),
  terms: z.boolean().refine((val) => val === true, 'You must accept the terms'),
  avatar: z.array(z.any()).optional()
});

const countryOptions = [
  { value: 'us', label: 'United States' },
  { value: 'ca', label: 'Canada' },
  { value: 'uk', label: 'United Kingdom' },
  { value: 'au', label: 'Australia' },
  { value: 'de', label: 'Germany' },
  { value: 'fr', label: 'France' }
];

const frameworkOptions = [
  { value: 'next', label: 'Next.js' },
  { value: 'remix', label: 'Remix' },
  { value: 'astro', label: 'Astro' },
  { value: 'nuxt', label: 'Nuxt' },
  { value: 'svelte', label: 'SvelteKit' },
  { value: 'angular', label: 'Angular' }
];

const interestOptions = [
  { value: 'technology', label: 'Technology' },
  { value: 'sports', label: 'Sports' },
  { value: 'music', label: 'Music' },
  { value: 'travel', label: 'Travel' },
  { value: 'cooking', label: 'Cooking' },
  { value: 'reading', label: 'Reading' }
];

const genderOptions = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer-not-to-say', label: 'Prefer not to say' }
];

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className='space-y-1'>
      <Separator />
      <h3 className='text-muted-foreground pt-2 text-sm font-medium tracking-wide uppercase'>
        {children}
      </h3>
    </div>
  );
}

type DemoFormValues = z.infer<typeof demoFormSchema>;

export default function DemoForm() {
  const form = useForm({
    resolver: zodResolver(demoFormSchema),
    defaultValues: {
      name: '',
      email: '',
      age: undefined as unknown as number,
      password: '',
      phone: '',
      website: '',
      bio: '',
      country: '',
      framework: '',
      interests: [] as string[],
      gender: '',
      newsletter: false,
      rating: 5,
      birthDate: undefined as Date | undefined,
      dateRange: undefined as DateRange | undefined,
      eventTime: '',
      favoriteColor: '#6366f1',
      otp: '',
      formatting: [] as string[],
      tags: [] as string[],
      terms: false,
      avatar: [] as File[]
    }
  });

  const formValues = useWatch({ control: form.control });
  const interests = formValues.interests ?? [];

  function onSubmit() {
    alert('Form submitted successfully!');
  }

  return (
    <div className='grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]'>
      <Card>
        <CardHeader>
          <CardTitle className='text-2xl font-bold'>All Form Inputs Demo</CardTitle>
          <p className='text-muted-foreground'>
            Every possible form input — built with React Hook Form + Zod + shadcn/ui
          </p>
        </CardHeader>
        <CardContent>
          <FormProvider {...form}>
            <form
              className='space-y-6'
              noValidate
              aria-busy={form.formState.isSubmitting}
              onSubmit={form.handleSubmit(onSubmit)}
            >
              <SectionTitle>Text Inputs</SectionTitle>

              <FieldGroup className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                <TextField name='name' label='Full Name' required placeholder='John Doe' />
                <TextField
                  name='email'
                  label='Email'
                  required
                  type='email'
                  placeholder='john@example.com'
                />
                <TextField
                  name='password'
                  label='Password'
                  required
                  type='password'
                  placeholder='Min 8 characters'
                />
                <TextField
                  name='age'
                  label='Age'
                  required
                  type='number'
                  min={18}
                  max={100}
                  placeholder='18'
                />
                <TextField
                  name='phone'
                  label='Phone'
                  required
                  type='tel'
                  placeholder='+1 (555) 000-0000'
                />
                <TextField name='website' label='Website' type='url' placeholder='https://example.com' />
              </FieldGroup>

              <TextareaField
                name='bio'
                label='Bio'
                required
                placeholder='Tell us about yourself...'
                maxLength={500}
                rows={4}
                showCount
              />

              <SectionTitle>Select & Combobox</SectionTitle>

              <FieldGroup className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                <SelectField
                  name='country'
                  label='Country'
                  required
                  options={countryOptions}
                  placeholder='Select your country'
                />
                <ComboboxField
                  name='framework'
                  label='Framework'
                  required
                  description='Searchable dropdown'
                  options={frameworkOptions}
                  placeholder='Search frameworks...'
                />
              </FieldGroup>

              <SectionTitle>Checkbox & Radio</SectionTitle>

              <CheckboxGroupField
                name='interests'
                label='Interests'
                required
                description='Select all that apply'
                options={interestOptions}
                className='grid grid-cols-2 gap-3 md:grid-cols-3'
              />
              {interests.length > 0 ? (
                <div className='flex flex-wrap gap-2'>
                  {interests.map((v) => (
                    <Badge key={v} variant='secondary'>
                      {interestOptions.find((o) => o.value === v)?.label || v}
                    </Badge>
                  ))}
                </div>
              ) : null}

              <RadioGroupField name='gender' label='Gender' required options={genderOptions} />

              <SectionTitle>Toggle & Switch</SectionTitle>

              <SwitchField
                name='newsletter'
                label='Subscribe to Newsletter'
                description='Receive updates about new features and products'
              />

              <ToggleGroupField
                name='formatting'
                label='Text Formatting'
                description='Multi-select toggle group'
              >
                <ToggleGroupItem value='bold' aria-label='Bold'>
                  <Icons.bold className='h-4 w-4' />
                </ToggleGroupItem>
                <ToggleGroupItem value='italic' aria-label='Italic'>
                  <Icons.italic className='h-4 w-4' />
                </ToggleGroupItem>
                <ToggleGroupItem value='underline' aria-label='Underline'>
                  <Icons.underline className='h-4 w-4' />
                </ToggleGroupItem>
              </ToggleGroupField>

              <CheckboxField name='terms' label='I agree to the Terms and Conditions' required />

              <SectionTitle>Slider</SectionTitle>

              <SliderField
                name='rating'
                label='Overall Rating'
                description='Rate your experience (0-10)'
                min={0}
                max={10}
                step={0.5}
              />

              <SectionTitle>Date & Time</SectionTitle>

              <FieldGroup className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                <DatePickerField
                  name='birthDate'
                  label='Birth Date'
                  disabledDates={(date) => date > new Date()}
                />
                <TextField name='eventTime' label='Event Time' type='time' />
              </FieldGroup>

              <DateRangeField name='dateRange' label='Date Range' />

              <SectionTitle>Special Inputs</SectionTitle>

              <FieldGroup className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                <OtpField
                  name='otp'
                  label='Verification Code'
                  required
                  description='6-digit OTP input'
                />
                <ColorField
                  name='favoriteColor'
                  label='Favorite Color'
                  description='Native color picker with hex'
                />
              </FieldGroup>

              <TagsField
                name='tags'
                label='Tags'
                required
                description='Press Enter or click Add to create tags'
              />

              <SectionTitle>File Upload</SectionTitle>

              <FileUploadField
                name='avatar'
                label='Profile Picture'
                description='Drag & drop or click to upload (max 5MB)'
                maxSize={5000000}
                maxFiles={1}
              />

              <Separator />
              <div className='flex gap-4 pt-2'>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => form.reset()}
                  className='flex-1'
                >
                  Reset
                </Button>
                <SubmitButton className='flex-1'>Submit Form</SubmitButton>
              </div>
            </form>
          </FormProvider>
        </CardContent>
      </Card>

      <div className='xl:sticky xl:top-16 xl:self-start'>
        <Card>
          <CardHeader>
            <CardTitle>Form Data Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className='bg-muted max-h-[calc(100vh-8rem)] overflow-auto rounded-lg p-4 text-xs'>
              {JSON.stringify(formValues, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
