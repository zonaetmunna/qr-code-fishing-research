import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { Text as RNText } from 'react-native';

import { cn } from '@/lib/utils';

const textVariants = cva('text-zinc-900 dark:text-zinc-50', {
  variants: {
    variant: {
      largeTitle: 'text-4xl font-bold tracking-tight',
      title1: 'text-2xl font-bold tracking-tight',
      title2: 'text-xl font-semibold',
      title3: 'text-lg font-semibold',
      heading: 'text-base font-semibold',
      body: 'text-base',
      callout: 'text-base',
      subhead: 'text-sm',
      footnote: 'text-xs',
      caption: 'text-xs text-zinc-500 dark:text-zinc-400',
      muted: 'text-sm text-zinc-500 dark:text-zinc-400',
      mono: 'font-mono text-sm text-zinc-700 dark:text-zinc-300',
    },
  },
  defaultVariants: { variant: 'body' },
});

/**
 * Lets a parent component (e.g. Button) push text classes down to a nested
 * <Text> without prop-drilling — the NativeWindUI pattern.
 */
const TextClassContext = React.createContext<string | undefined>(undefined);

type TextProps = React.ComponentProps<typeof RNText> & VariantProps<typeof textVariants>;

function Text({ className, variant, ...props }: TextProps) {
  const contextClass = React.useContext(TextClassContext);
  return (
    <RNText className={cn(textVariants({ variant }), contextClass, className)} {...props} />
  );
}

export { Text, TextClassContext, textVariants };
export type { TextProps };
