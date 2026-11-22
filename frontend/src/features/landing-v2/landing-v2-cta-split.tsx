import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  primary: ReactNode;
  secondary?: ReactNode;
  className?: string;
};

export function LandingCtaSplit({ primary, secondary, className }: Props) {
  return (
    <div className={cn('landing-cta-split', className)}>
      {primary}
      {secondary}
    </div>
  );
}