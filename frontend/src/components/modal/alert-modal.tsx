'use client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { LoadingButton } from '@/components/ui/loading-button';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
  title?: string;
  description?: string;
  confirmLabel?: string;
}

export function AlertModal({
  isOpen,
  onClose,
  onConfirm,
  loading,
  title = 'Are you sure?',
  description = 'This action cannot be undone.',
  confirmLabel = 'Continue'
}: AlertModalProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='sm:max-w-md gap-0 p-0 overflow-hidden'>
        <DialogHeader className='bg-destructive'>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className='px-4 pt-4 pb-2'>
          <p className='text-sm text-muted-foreground'>{description}</p>
        </div>
        <Separator />
        <div className='px-4 py-3 flex items-center justify-end gap-2'>
          <Button variant='outline' onClick={onClose}>
            Cancel
          </Button>
          <LoadingButton loading={loading} type='button' variant='destructive' onClick={onConfirm}>
            {confirmLabel}
          </LoadingButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
