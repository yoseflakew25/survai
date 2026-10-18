'use client';

import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { LoadingButton } from '@/components/ui/loading-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FieldGroup } from '@/components/ui/field';
import { TextField } from '@/components/forms/fields/text-field';
import { TextareaField } from '@/components/forms/fields/textarea-field';
import { SelectField } from '@/components/forms/fields/select-field';
import { FileUploadField } from '@/components/forms/fields/file-upload-field';
import { categoryOptions } from '@/features/products/constants/product-options';
import { productSchema } from '@/features/products/schemas/product';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from '@/lib/toast';
import { createProductMutation, updateProductMutation } from '../api/mutations';
import type { Product } from '../api/types';
import type { z } from 'zod';

type ProductFormValues = z.infer<typeof productSchema>;

export default function ProductForm({
  initialData,
  pageTitle
}: {
  initialData: Product | null;
  pageTitle: string;
}) {
  const router = useRouter();
  const isEdit = !!initialData;

  const createMutation = useMutation({
    ...createProductMutation,
    onSuccess: () => {
      toast.success('Product created');
      router.push('/dashboard/product');
    },
    onError: () => {
      toast.error("Couldn't create product. Try again.");
    }
  });

  const updateMutation = useMutation({
    ...updateProductMutation,
    onSuccess: () => {
      toast.success('Product updated');
      router.push('/dashboard/product');
    },
    onError: () => {
      toast.error("Couldn't update product. Try again.");
    }
  });

  const form = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: {
      image: undefined,
      name: initialData?.name ?? '',
      category: initialData?.category ?? '',
      price: initialData?.price,
      description: initialData?.description ?? ''
    }
  });

  function onSubmit(value: ProductFormValues) {
    const payload = {
      name: value.name,
      category: value.category,
      price: value.price,
      description: value.description
    };

    if (isEdit) {
      updateMutation.mutate({ id: initialData.id, values: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Card className='mx-auto w-full max-w-3xl'>
      <CardHeader>
        <CardTitle className='text-left text-2xl font-bold'>{pageTitle}</CardTitle>
      </CardHeader>
      <CardContent>
        <FormProvider {...form}>
          <form className='space-y-8' onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup>
              <FileUploadField
                name='image'
                label='Product Image'
                description='Upload a product image'
                maxSize={5 * 1024 * 1024}
                maxFiles={4}
              />

              <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
                <TextField name='name' label='Product Name' required placeholder='Enter product name' />

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
              </div>

              <TextareaField
                name='description'
                label='Description'
                required
                placeholder='Enter product description'
                maxLength={500}
                rows={4}
              />
            </FieldGroup>

            <div className='flex justify-end gap-2'>
              <Button type='button' variant='outline' onClick={() => router.back()}>
                Cancel
              </Button>
              <LoadingButton loading={isPending} type='submit'>
                {isEdit ? 'Update Product' : 'Add Product'}
              </LoadingButton>
            </div>
          </form>
        </FormProvider>
      </CardContent>
    </Card>
  );
}
