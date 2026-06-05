import * as React from 'react';
import { View } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { getClassificationStyle } from '@/lib/classification-styles';
import { formatPayloadKind, type ScanResult } from '@/lib/scan-api';

/** Renders a scan result — mirrors the web result card in app/page.tsx. */
export function ScanResultCard({ result }: { result: ScanResult }) {
  // Risk tier only applies when the payload was treated as a web URL.
  const tier = result.link_analysis_applied
    ? getClassificationStyle(result.classification)
    : null;

  return (
    <Card className="gap-0 p-0">
      {/* Header: payload kind + risk tier + confidence */}
      <View className="flex-row flex-wrap items-center gap-2 border-b border-zinc-200 p-5 dark:border-zinc-800">
        <Text variant="heading">Result</Text>
        <Badge label={formatPayloadKind(result.payload_kind)} />
        {tier ? <Badge label={tier.label} className={tier.badge} textClassName={tier.bannerText} /> : null}
        <Text variant="caption" className="ml-auto tabular-nums">
          {result.link_analysis_applied
            ? `${result.confidence.toFixed(1)}% link confidence`
            : 'Link scan: n/a'}
        </Text>
      </View>

      <CardContent className="p-5">
        {/* Decoded payload */}
        <View className="gap-1">
          <Text variant="caption" className="uppercase tracking-wide">
            Decoded payload
          </Text>
          <Text variant="mono" className="break-all">
            {result.extracted_url}
          </Text>
        </View>

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
