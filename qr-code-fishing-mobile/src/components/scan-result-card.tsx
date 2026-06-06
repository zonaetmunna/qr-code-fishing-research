import * as React from 'react';
import { Linking, View } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { getClassificationStyle } from '@/lib/classification-styles';
import { formatPayloadKind, type ScanResult } from '@/lib/scan-api';

/** Ensure the decoded URL has a scheme before opening it. */
function toHref(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

/** Renders a scan result — mirrors the web result card in app/page.tsx. */
export function ScanResultCard({ result }: { result: ScanResult }) {
  // Risk tier only applies when the payload was treated as a web URL.
  const tier = result.link_analysis_applied
    ? getClassificationStyle(result.classification)
    : null;

  const pct = Math.min(100, Math.max(0, result.confidence));

  return (
    <Card className="gap-0 p-0">
      {/* Header: payload kind */}
      <View className="flex-row flex-wrap items-center gap-2 border-b border-zinc-200 p-5 dark:border-zinc-800">
        <Text variant="heading">Result</Text>
        <Badge label={formatPayloadKind(result.payload_kind)} />
      </View>

      <CardContent className="p-5">
        {/* Big verdict banner */}
        {tier ? (
          <View className={`flex-row items-center gap-3 rounded-2xl border p-4 ${tier.banner}`}>
            <Text className={`text-2xl font-bold ${tier.bannerText}`}>{tier.icon}</Text>
            <View className="flex-1">
              <Text className={`text-base font-bold ${tier.bannerText}`}>{tier.label}</Text>
              <Text className={`text-sm ${tier.bannerText}`}>{tier.meaning}</Text>
            </View>
          </View>
        ) : (
          <View className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-800/40">
            <Text variant="muted">
              This QR isn’t a web link, so phishing scoring doesn’t apply.
            </Text>
          </View>
        )}

        {/* Confidence meter */}
        {tier ? (
          <View className="gap-1.5">
            <View className="flex-row justify-between">
              <Text variant="caption">Model confidence</Text>
              <Text variant="caption" className="tabular-nums">
                {result.confidence.toFixed(0)}%
              </Text>
            </View>
            <View className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
              <View className={`h-full rounded-full ${tier.bar}`} style={{ width: `${pct}%` }} />
            </View>
          </View>
        ) : null}

        {/* Decoded payload */}
        <View className="gap-1">
          <Text variant="caption" className="uppercase tracking-wide">
            Decoded payload
          </Text>
          <Text variant="mono" className="break-all">
            {result.extracted_url}
          </Text>
        </View>

        {/* Open the destination (the user decides) */}
        {result.payload_kind === 'url' ? (
          <View className="gap-1.5">
            <Button
              variant={result.classification === 'safe' ? 'primary' : 'destructive'}
              onPress={() => {
                void Linking.openURL(toHref(result.extracted_url)).catch(() => {});
              }}
            >
              <Text>{result.classification === 'safe' ? 'Open link' : 'Open anyway'}</Text>
            </Button>
            {result.classification !== 'safe' ? (
              <Text variant="footnote" className="text-zinc-500 dark:text-zinc-400">
                We flagged this link — open only if you are sure it’s genuine.
              </Text>
            ) : null}
          </View>
        ) : null}

        {/* Wi‑Fi details */}
        {result.wifi ? (
          <View className="gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-800/40">
            <Text variant="heading" className="text-sm">
              Wi‑Fi details
            </Text>
            <Text variant="caption">Network name (SSID): {result.wifi.ssid || '—'}</Text>
            <Text variant="caption">Security: {result.wifi.security || '—'}</Text>
            <Text variant="caption">Hidden network: {result.wifi.hidden ? 'Yes' : 'No'}</Text>
            <Text variant="caption">Password: not shown (never stored in clear text)</Text>
          </View>
        ) : null}

        {/* Indicators / notes */}
        {result.indicators.length > 0 ? (
          <View className="gap-2">
            <Text variant="caption" className="uppercase tracking-wide">
              Notes
            </Text>
            <View className="gap-1.5">
              {result.indicators.map((ind) => (
                <View key={ind} className="flex-row gap-2">
                  <Text variant="muted">•</Text>
                  <Text variant="muted" className="flex-1">
                    {ind}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </CardContent>
    </Card>
  );
}
