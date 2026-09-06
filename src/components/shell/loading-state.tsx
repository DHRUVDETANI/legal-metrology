import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingStateProps extends React.HTMLAttributes<HTMLDivElement> {
  message?: string;
  description?: string;
}

export function LoadingState({
  message = 'Processing...',
  description = 'Please wait while the operation completes.',
  className,
  ...props
}: LoadingStateProps) {
  return (
    <div
      className={cn(
        'flex min-h-[260px] flex-col items-center justify-center p-6 text-center',
        className
      )}
      {...props}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-4">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
      <h3 className="text-base font-semibold text-foreground">{message}</h3>
      {description && (
        <p className="mt-1 text-xs text-muted-foreground max-w-sm">
          {description}
        </p>
      )}
    </div>
  );
}
