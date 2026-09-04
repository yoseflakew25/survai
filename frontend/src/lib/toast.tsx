// ============================================================
// Toast helper — thin wrapper over react-hot-toast that keeps
// the app's established API (toast.success(msg, { description }),
// toast.warning, toast.info) since react-hot-toast itself has
// no built-in description support.
// ============================================================

import hotToast from 'react-hot-toast';
import type { ReactElement, ReactNode } from 'react';

// react-hot-toast accepts ReactElement | string | null
type ToastMessage = ReactElement | string;

interface ToastOptions {
  description?: ReactNode;
}

function withDescription(
  message: ToastMessage,
  description?: ReactNode
): ToastMessage {
  if (!description) return message;
  return (
    <div>
      <p className='text-sm font-medium'>{message}</p>
      <p className='text-xs opacity-80'>{description}</p>
    </div>
  );
}

export const toast = Object.assign(
  (message: ToastMessage) => hotToast(message),
  {
    success: (message: ToastMessage, options?: ToastOptions) =>
      hotToast.success(withDescription(message, options?.description)),
    error: (message: ToastMessage, options?: ToastOptions) =>
      hotToast.error(withDescription(message, options?.description)),
    loading: (message: ToastMessage) => hotToast.loading(message),
    dismiss: (id?: string) => hotToast.dismiss(id),
    promise: hotToast.promise,
    warning: (message: ToastMessage) => hotToast(message, { icon: '⚠️' }),
    info: (message: ToastMessage) => hotToast(message, { icon: 'ℹ️' })
  }
);