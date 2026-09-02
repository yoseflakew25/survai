'use client';

import { useCallback, useRef, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';

interface AvatarUploadProps {
  initials: string;
  currentImage?: string | null;
  onImageChange?: (file: File) => void;
}

export function AvatarUpload({ initials, currentImage, onImageChange }: AvatarUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [cropPosition, setCropPosition] = useState({ x: 50, y: 50 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
      setShowCropDialog(true);
      setCropPosition({ x: 50, y: 50 });
    };
    reader.readAsDataURL(file);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFileSelect(file);
      e.target.value = '';
    },
    [handleFileSelect]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!previewRef.current) return;

      const handleMove = (moveEvent: MouseEvent) => {
        const rect = previewRef.current?.getBoundingClientRect();
        if (!rect) return;
        const x = ((moveEvent.clientX - rect.left) / rect.width) * 100;
        const y = ((moveEvent.clientY - rect.top) / rect.height) * 100;
        setCropPosition({
          x: Math.max(0, Math.min(100, x)),
          y: Math.max(0, Math.min(100, y))
        });
      };

      const handleUp = () => {
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleUp);
      };

      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', handleUp);
    },
    []
  );

  const handleSave = useCallback(() => {
    if (preview) {
      // In production, this would send the crop coordinates + image to a server
      onImageChange?.(new File([], 'avatar.png'));
    }
    setShowCropDialog(false);
    setPreview(null);
  }, [preview, onImageChange]);

  const handleRemove = useCallback(() => {
    setPreview(null);
    setShowCropDialog(false);
  }, []);

  return (
    <>
      <div className='flex flex-col items-center gap-3'>
        {/* Avatar with drag overlay */}
        <div
          className={cn(
            'relative group cursor-pointer',
            isDragging && 'ring-2 ring-primary ring-offset-2 ring-offset-background rounded-full'
          )}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
        >
          <Avatar className='h-20 w-20 border-2 border-primary/20 transition-all'>
            <AvatarImage src={currentImage || undefined} alt='Profile' />
            <AvatarFallback className='bg-primary/10 text-primary text-xl font-semibold'>
              {initials}
            </AvatarFallback>
          </Avatar>

          {/* Hover overlay */}
          <div className='absolute inset-0 flex items-center justify-center rounded-full bg-black/0 transition-all group-hover:bg-black/40'>
            <Icons.camera className='size-5 text-white opacity-0 transition-opacity group-hover:opacity-100' />
          </div>

          {/* Drag overlay */}
          {isDragging && (
            <div className='absolute inset-0 flex items-center justify-center rounded-full bg-primary/20 border-2 border-dashed border-primary'>
              <Icons.upload className='size-5 text-primary' />
            </div>
          )}
        </div>

        <div className='flex gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={() => fileInputRef.current?.click()}
          >
            <Icons.upload className='mr-2 size-3.5' />
            Upload Photo
          </Button>
          {currentImage && (
            <Button variant='ghost' size='sm' className='text-destructive hover:text-destructive'>
              <Icons.trash className='mr-2 size-3.5' />
              Remove
            </Button>
          )}
        </div>

        <input
          ref={fileInputRef}
          type='file'
          accept='image/*'
          className='hidden'
          onChange={handleInputChange}
        />
      </div>

      {/* Crop Dialog */}
      <Dialog open={showCropDialog} onOpenChange={setShowCropDialog}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Adjust Profile Photo</DialogTitle>
            <DialogDescription>
              Drag to position the crop area. Your photo will be displayed as a circle.
            </DialogDescription>
          </DialogHeader>

          {preview && (
            <div className='space-y-4'>
              {/* Preview with crop */}
              <div
                ref={previewRef}
                className='relative mx-auto aspect-square w-48 cursor-move overflow-hidden rounded-full border-2 border-primary/30'
                onMouseDown={handleMouseDown}
              >
                <img
                  src={preview}
                  alt='Preview'
                  className='h-full w-full object-cover'
                  style={{
                    objectPosition: `${cropPosition.x}% ${cropPosition.y}%`
                  }}
                />
                {/* Crosshair */}
                <div
                  className='pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-lg'
                  style={{
                    left: `${cropPosition.x}%`,
                    top: `${cropPosition.y}%`
                  }}
                />
              </div>

              <p className='text-muted-foreground text-center text-xs'>
                Click and drag to adjust the position
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant='outline' onClick={handleRemove}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save Photo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
