'use client';

import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { FieldGroup } from '@/components/ui/field';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from '@/components/ui/sheet';
import { Icons } from '@/components/icons';
import { useState } from 'react';
import { TextField } from '@/components/forms/fields/text-field';
import { TextareaField } from '@/components/forms/fields/textarea-field';
import { SelectField } from '@/components/forms/fields/select-field';

const productSchema = z.object({
  name: z.string().min(2, 'Product name must be at least 2 characters'),
  category: z.string().min(1, 'Please select a category'),
  price: z.number({ error: 'Price is required' }).min(0.01, 'Price must be greater than 0'),
  description: z.string().min(10, 'Description must be at least 10 characters')
});

const categoryOptions = [
  { value: 'beauty', label: 'Beauty Products' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'home', label: 'Home & Garden' },
  { value: 'sports', label: 'Sports & Outdoors' }
];

export default function SheetProductForm() {
  const [open, setOpen] = useState(false);

  const form = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      category: '',
      price: undefined as unknown as number,
      description: ''
    }
  });

  function onSubmit() {
    alert('Product created successfully!');
    setOpen(false);
    form.reset();
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button />}>
        <Icons.add className='mr-2 h-4 w-4' />
        Add Product
      </SheetTrigger>
      <SheetContent className='flex flex-col'>
        <SheetHeader>
          <SheetTitle>New Product</SheetTitle>
          <SheetDescription>Fill in the details to create a new product.</SheetDescription>
        </SheetHeader>

        <div className='flex-1 overflow-auto'>
          <FormProvider {...form}>
            <form
              id='sheet-product-form'
              className='space-y-4 p-4 md:p-4'
              onSubmit={form.handleSubmit(onSubmit)}
            >
              <FieldGroup>
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
                  step='0.01'
                  placeholder='Enter price'
                />
                <TextareaField
                  name='description'
                  label='Description'
                  required
                  placeholder='Enter product description'
                  maxLength={500}
                  rows={4}
                  showCount
                />
              </FieldGroup>
            </form>
          </FormProvider>
        </div>

        <SheetFooter>
          <Button type='button' variant='outline' onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type='submit' form='sheet-product-form'>
            Create Product
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
