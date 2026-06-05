import type { Classification } from '@/lib/scan-api';

/**
 * Map an API classification tier to a label and NativeWind class names.
 * Mirrors the web app's getClassificationBadgeProps
 * (qr-code-fishing-frontend/lib/classification-styles.ts), but returns
 * Tailwind class strings instead of shadcn badge variants.
 */
export type ClassificationStyle = {
  label: string;
  /** Plain-language meaning shown under the headline. */
  meaning: string;
  /** Short glyph icon for the banner. */
  icon: string;
  /** Classes for a small badge (background + text). */
  badge: string;
  /** Classes for the large result banner (background + border). */
  banner: string;
  /** Classes for the banner's headline text. */
  bannerText: string;
  /** Solid fill class for the confidence meter bar. */
  bar: string;
};

export function getClassificationStyle(c: Classification): ClassificationStyle {
  switch (c) {
    case 'safe':
      return {
        label: 'Safe',
        meaning: 'No phishing signals detected.',
        icon: '✓',
        badge: 'bg-safe-soft dark:bg-safe-softDark text-safe',
        banner: 'bg-safe-soft dark:bg-safe-softDark border-safe/40',
        bannerText: 'text-safe',
        bar: 'bg-safe',
      };
    case 'risky':
      return {
        label: 'Risky',
        meaning: 'Some suspicious signals — open only if you trust the source.',
        icon: '!',
        badge: 'bg-risky-soft dark:bg-risky-softDark text-risky',
        banner: 'bg-risky-soft dark:bg-risky-softDark border-risky/40',
        bannerText: 'text-risky',
        bar: 'bg-risky',
      };
    case 'dangerous':
      return {
        label: 'Dangerous',
        meaning: 'Likely phishing — do not open this link.',
        icon: '✕',
        badge: 'bg-dangerous-soft dark:bg-dangerous-softDark text-dangerous',
        banner: 'bg-dangerous-soft dark:bg-dangerous-softDark border-dangerous/40',
        bannerText: 'text-dangerous',
        bar: 'bg-dangerous',
      };
    default:
      return {
        label: String(c),
        meaning: '',
        icon: '•',
        badge: 'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300',
        banner: 'bg-zinc-100 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700',
        bannerText: 'text-zinc-700 dark:text-zinc-300',
        bar: 'bg-zinc-400',
      };
  }
}
