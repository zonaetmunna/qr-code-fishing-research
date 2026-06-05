import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { apiBaseURL } from '@/lib/scan-api';

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <View className="flex-row gap-3">
      <View className="h-7 w-7 items-center justify-center rounded-full bg-brand/10 dark:bg-brand/20">
        <Text className="text-sm font-semibold text-brand">{n}</Text>
      </View>
      <View className="flex-1 gap-0.5">
        <Text variant="heading" className="text-sm">
          {title}
        </Text>
        <Text variant="muted">{children}</Text>
      </View>
    </View>
  );
}

function Signal({ children }: { children: ReactNode }) {
  return (
    <View className="flex-row gap-2">
      <Text variant="muted">·</Text>
      <Text variant="muted" className="flex-1">
        {children}
      </Text>
    </View>
  );
}

export default function AboutScreen() {
  return (
    <SafeAreaView className="flex-1 bg-zinc-50 dark:bg-black" edges={['top']}>
      <ScrollView className="flex-1" contentContainerClassName="gap-6 p-5 pb-24">
        <View className="gap-2">
          <Text variant="largeTitle">About</Text>
          <Text variant="muted">
            How this app analyzes a QR code — from image to a plain-language verdict.
          </Text>
        </View>

        <Card>
          <CardHeader>
            <CardTitle>How it works</CardTitle>
            <CardDescription>Three steps from image to insight.</CardDescription>
          </CardHeader>
          <CardContent>
            <Step n={1} title="Decode">
              We read the QR payload from your camera photo or gallery image (web links, Wi‑Fi,
              text, etc.); nothing is opened in a browser.
            </Step>
            <Step n={2} title="Score">
              For http(s) links only, heuristics check HTTPS, host shape, TLDs, and common phishing
              patterns — plus an ML visual risk score.
            </Step>
            <Step n={3} title="Explain">
              You get a tier (safe / risky / dangerous), a confidence score, and the reasons behind
              it.
            </Step>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>What we look at</CardTitle>
            <CardDescription>Examples of signals in the current rules.</CardDescription>
          </CardHeader>
          <CardContent className="gap-2">
            <Signal>HTTP vs HTTPS and raw IP hosts</Signal>
            <Signal>Suspicious TLDs and deep subdomain chains</Signal>
            <Signal>Userinfo “@” tricks and trusted-brand relief heuristics</Signal>
            <Signal>ML visual risk score from the QR image itself</Signal>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Connection</CardTitle>
            <CardDescription>Where this app sends images for analysis.</CardDescription>
          </CardHeader>
          <CardContent>
            <Text variant="mono" className="break-all">
              {apiBaseURL}
            </Text>
            <Text variant="footnote" className="text-zinc-500 dark:text-zinc-400">
              Set EXPO_PUBLIC_API_URL to point at your backend. On a physical device this must be
              the dev machine&apos;s LAN IP, not localhost.
            </Text>
          </CardContent>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
