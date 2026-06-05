import * as React from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

type BadgeProps = React.ComponentProps<typeof View> & {
  label: string;
  /** Extra classes for the pill (e.g. tier colors from classification-styles). */
  className?: string;
  /** Extra classes for the label text. */
  textClassName?: string;
};

/** Small rounded pill used for payload kind and risk tier. */
function Badge({ label, className, textClassName, ...props }: BadgeProps) {
  return (
    <View
      className={cn(
        'self-start rounded-full border border-zinc-200 bg-zinc-100 px-2.5 py-1 dark:border-zinc-700 dark:bg-zinc-800',
        className
      )}
      {...props}
    >
      <Text className={cn('text-xs font-semibold', textClassName)}>{label}</Text>
    </View>
  );
}

export { Badge };
export type { BadgeProps };
