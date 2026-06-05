import { cva, type VariantProps } from 'class-variance-authority';
import type * as React from 'react';
import { ActivityIndicator, Pressable } from 'react-native';

import { TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'flex-row items-center justify-center gap-2 rounded-2xl active:opacity-80',
  {
    variants: {
      variant: {
        primary: 'bg-brand',
        secondary: 'bg-zinc-100 dark:bg-zinc-800',
        tonal: 'bg-brand/10 dark:bg-brand/20',
        plain: 'bg-transparent',
        destructive: 'bg-dangerous',
      },
      size: {
        default: 'h-12 px-5',
        sm: 'h-10 px-4',
        lg: 'h-14 px-6',
      },
      disabled: {
        true: 'opacity-50',
        false: '',
      },
    },
    defaultVariants: { variant: 'primary', size: 'default', disabled: false },
  }
);

const buttonTextVariants = cva('text-base font-semibold', {
  variants: {
    variant: {
      primary: 'text-brand-fg',
      secondary: 'text-zinc-900 dark:text-zinc-50',
      tonal: 'text-brand',
      plain: 'text-brand',
      destructive: 'text-white',
    },
  },
  defaultVariants: { variant: 'primary' },
});

type ButtonProps = Omit<React.ComponentProps<typeof Pressable>, 'children'> &
  VariantProps<typeof buttonVariants> & {
    /** Show a spinner and block presses. */
    loading?: boolean;
    children?: React.ReactNode;
  };

function Button({
  className,
  variant,
  size,
  disabled,
  loading,
  children,
  ...props
}: ButtonProps) {
  const isDisabled = !!disabled || !!loading;
  return (
    <TextClassContext.Provider value={buttonTextVariants({ variant })}>
      <Pressable
        accessibilityRole="button"
        disabled={isDisabled}
        className={cn(buttonVariants({ variant, size, disabled: isDisabled }), className)}
        {...props}
      >
        {loading ? (
          <ActivityIndicator
            color={variant === 'primary' || variant === 'destructive' ? '#ffffff' : '#208AEF'}
          />
        ) : null}
        {children}
      </Pressable>
    </TextClassContext.Provider>
  );
}

export { Button, buttonTextVariants, buttonVariants };
export type { ButtonProps };
