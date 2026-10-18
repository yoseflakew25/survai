'use client';

import { useEffect, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { FieldGroup } from '@/components/ui/field';
import { TextField } from '@/components/forms/fields/text-field';
import { SelectField } from '@/components/forms/fields/select-field';
import { LoadingButton } from '@/components/ui/loading-button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet';
import { Icons } from '@/components/icons';
import { useMutation } from '@tanstack/react-query';
import { createUserMutation, updateUserMutation } from '../api/mutations';
import type { User } from '../api/types';
import { toast } from '@/lib/toast';
import { userSchema, type UserFormValues } from '../schemas/user';
import { ROLE_OPTIONS } from './users-table/options';

const STATUS_OPTIONS = [
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' },
  { value: 'Invited', label: 'Invited' }
];

interface UserFormSheetProps {
  user?: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserFormSheet({ user, open, onOpenChange }: UserFormSheetProps) {
  const isEdit = !!user;

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      first_name: user?.first_name ?? '',
      last_name: user?.last_name ?? '',
      email: user?.email ?? '',
      phone: user?.phone ?? '',
      role: user?.role ?? '',
      status: user?.status ?? 'Active'
    }
  });

  useEffect(() => {
    form.reset({
      first_name: user?.first_name ?? '',
      last_name: user?.last_name ?? '',
      email: user?.email ?? '',
      phone: user?.phone ?? '',
      role: user?.role ?? '',
      status: user?.status ?? 'Active'
    });
  }, [user, form]);

  const createMutation = useMutation({
    ...createUserMutation,
    onSuccess: () => {
      toast.success('User created');
      onOpenChange(false);
      form.reset();
    },
    onError: () => toast.error("Couldn't create user. Try again.")
  });

  const updateMutation = useMutation({
    ...updateUserMutation,
    onSuccess: () => {
      toast.success('User updated');
      onOpenChange(false);
    },
    onError: () => toast.error("Couldn't update user. Try again.")
  });

  async function onSubmit(value: UserFormValues) {
    if (isEdit) {
      await updateMutation.mutateAsync({ id: user.id, values: value });
    } else {
      await createMutation.mutateAsync(value);
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className='flex flex-col'>
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Edit User' : 'New User'}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? 'Update the user details below.'
              : 'Fill in the details to create a new user.'}
          </SheetDescription>
        </SheetHeader>

        <div className='flex-1 overflow-auto'>
          <FormProvider {...form}>
            <form
              id='user-form-sheet'
              className='space-y-4 p-4 md:p-4'
              onSubmit={form.handleSubmit(onSubmit)}
            >
              <FieldGroup>
                <div className='grid grid-cols-2 gap-4'>
                  <TextField name='first_name' label='First Name' required placeholder='John' />
                  <TextField name='last_name' label='Last Name' required placeholder='Doe' />
                </div>

                <TextField
                  name='email'
                  label='Email'
                  required
                  type='email'
                  placeholder='john@example.com'
                />

                <TextField
                  name='phone'
                  label='Phone'
                  required
                  type='tel'
                  placeholder='(555) 123-4567'
                />

                <SelectField
                  name='role'
                  label='Role'
                  required
                  options={ROLE_OPTIONS}
                  placeholder='Select role'
                />

                <SelectField
                  name='status'
                  label='Status'
                  required
                  options={STATUS_OPTIONS}
                  placeholder='Select status'
                />
              </FieldGroup>
            </form>
          </FormProvider>
        </div>

        <SheetFooter>
          <Button type='button' variant='outline' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <LoadingButton loading={isPending} type='submit' form='user-form-sheet'>
            {isEdit ? 'Update User' : 'Create User'}
          </LoadingButton>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function UserFormSheetTrigger() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Icons.add className='mr-2 h-4 w-4' /> Add User
      </Button>
      <UserFormSheet open={open} onOpenChange={setOpen} />
    </>
  );
}
