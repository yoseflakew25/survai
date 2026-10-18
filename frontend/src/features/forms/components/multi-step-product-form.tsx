'use client';

import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from '@/lib/toast';
import * as z from 'zod';
import { Icons } from '@/components/icons';
import { FieldDescription, FieldGroup } from '@/components/ui/field';
import { Progress } from '@/components/ui/progress';
import { motion, AnimatePresence } from 'motion/react';
import { useFormStepper } from '@/hooks/use-stepper';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { TextField } from '@/components/forms/fields/text-field';
import { TextareaField } from '@/components/forms/fields/textarea-field';
import { SelectField } from '@/components/forms/fields/select-field';

const productFormSchema = z.object({
  name: z.string().min(2, 'Product name must be at least 2 characters'),
  category: z.string().min(1, 'Please select a category'),
  price: z.number({ error: 'Price is required' }).min(0.01, 'Price must be greater than 0'),
  description: z.string().min(10, 'Description must be at least 10 characters')
});

const stepSchemas = [
  productFormSchema.pick({ name: true, category: true, price: true }),
  productFormSchema.pick({ description: true }),
  z.object({})
];

const categoryOptions = [
  { value: 'beauty', label: 'Beauty Products' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'home', label: 'Home & Garden' },
  { value: 'sports', label: 'Sports & Outdoors' }
];

function ReviewSummary({
  values
}: {
  values: {
    name?: string;
    category?: string;
    price?: number;
    description?: string;
  };
}) {
  return (
    <div className='space-y-3'>
      <Separator />
      <div className='grid gap-3'>
        <div>
          <p className='text-muted-foreground text-xs font-medium uppercase'>Name</p>
          <p className='text-sm'>{values.name || '—'}</p>
        </div>
        <div>
          <p className='text-muted-foreground text-xs font-medium uppercase'>Category</p>
          <p className='text-sm capitalize'>{values.category || '—'}</p>
        </div>
        <div>
          <p className='text-muted-foreground text-xs font-medium uppercase'>Price</p>
          <p className='text-sm'>{values.price != null ? `$${values.price}` : '—'}</p>
        </div>
        <div>
          <p className='text-muted-foreground text-xs font-medium uppercase'>Description</p>
          <p className='text-sm'>{values.description || '—'}</p>
        </div>
      </div>
    </div>
  );
}

type ProductFormValues = z.infer<typeof productFormSchema>;

export default function MultiStepProductForm() {
  const { step, currentStep, isFirstStep, handleCancelOrBack, handleNextStepOrSubmit } =
    useFormStepper(stepSchemas, { fullSchema: productFormSchema });

  const form = useForm({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: '',
      category: '',
      price: undefined as unknown as number,
      description: ''
    },
    mode: 'onSubmit'
  });

  const formValues = useWatch({ control: form.control });
  const isDirty = form.formState.isDirty;

  function onSubmit(_values: ProductFormValues) {
    toast.success('Product created successfully!');
  }

  const handleNext = async () => {
    await handleNextStepOrSubmit(form, onSubmit);
  };

  const totalSteps = 3;

  return (
    <FormProvider {...form}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void handleNext();
        }}
        noValidate
        className='mx-auto flex w-full flex-col gap-2 p-0'
      >
        <div className='flex flex-col gap-2 pt-3'>
          <div className='flex flex-col items-center justify-start gap-1'>
            <span className='text-muted-foreground text-sm'>
              Step {currentStep} of {totalSteps}
            </span>
            <Progress value={(currentStep / totalSteps) * 100} />
          </div>

          <AnimatePresence mode='popLayout'>
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.4, type: 'spring' }}
              className='flex flex-col gap-2'
            >
              {currentStep === 1 ? (
                <FieldGroup className='space-y-4'>
                  <h3 className='text-lg font-semibold'>Basic Info</h3>
                  <FieldDescription>Enter the product name, category, and price.</FieldDescription>
                  <TextField
                    name='name'
                    label='Product Name'
                    required
                    placeholder='Enter product name'
                  />
                  <SelectField
                    name='category'
                    label='Category'
                    required
                    options={categoryOptions}
                    placeholder='Select category'
                  />
                  <TextField
                    name='price'
                    label='Price'
                    required
                    type='number'
                    min={0}
                    step={0.01}
                    placeholder='Enter price'
                  />
                </FieldGroup>
              ) : null}

              {currentStep === 2 ? (
                <FieldGroup className='space-y-4'>
                  <h3 className='text-lg font-semibold'>Details</h3>
                  <FieldDescription>Add a detailed product description.</FieldDescription>
                  <TextareaField
                    name='description'
                    label='Description'
                    required
                    placeholder='Enter product description'
                    maxLength={500}
                    rows={5}
                  />
                </FieldGroup>
              ) : null}

              {currentStep === 3 ? (
                <div className='space-y-4'>
                  <h3 className='text-lg font-semibold'>Review & Submit</h3>
                  <FieldDescription>Review the details below before submitting.</FieldDescription>
                  <ReviewSummary values={formValues} />
                </div>
              ) : null}
            </motion.div>
          </AnimatePresence>

          <div className='flex w-full items-center justify-between gap-3 pt-3'>
            <Button
              variant='ghost'
              type='button'
              disabled={isFirstStep}
              onClick={() => handleCancelOrBack({ onBack: () => {} })}
            >
              <Icons.chevronLeft /> Previous
            </Button>
            <div className='flex w-full items-center justify-end gap-3 pt-3'>
              {isDirty ? (
                <Button
                  type='button'
                  onClick={() => form.reset()}
                  className='rounded-lg'
                  variant='outline'
                >
                  Reset
                </Button>
              ) : null}
              {step.isCompleted ? (
                <Button type='submit'>Submit</Button>
              ) : (
                <Button variant='ghost' type='button' onClick={() => void handleNext()}>
                  Next <Icons.chevronRight />
                </Button>
              )}
            </div>
          </div>
        </div>
      </form>
    </FormProvider>
  );
}
