import * as ImagePicker from 'expo-image-picker';
import * as React from 'react';
import { Alert, Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { QrCamera, type CapturedPhoto } from '@/components/qr-camera';
import { ScanResultCard } from '@/components/scan-result-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { formatScanError, scanQrImage, scanUrl, type ScanResult } from '@/lib/scan-api';
import { cn } from '@/lib/utils';

type Method = 'camera' | 'gallery' | 'url';

const METHODS: { id: Method; label: string }[] = [
  { id: 'camera', label: '📷 Camera' },
  { id: 'gallery', label: '🖼️ Gallery' },
  { id: 'url', label: '🔗 URL' },
];

export default function ScanScreen() {
  const [method, setMethod] = React.useState<Method>('camera');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<ScanResult | null>(null);
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [urlInput, setUrlInput] = React.useState('');
  const [cameraOpen, setCameraOpen] = React.useState(false);

  const analyze = React.useCallback(
    async (asset: { uri: string; mimeType?: string | null; fileName?: string | null }) => {
      setError(null);
      setResult(null);
      setFileName(asset.fileName ?? 'Photo');
      setLoading(true);
      try {
        const data = await scanQrImage(asset);
        setResult(data);
      } catch (err) {
        setError(formatScanError(err));
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const onUrlSubmit = React.useCallback(async () => {
    const value = urlInput.trim();
    if (!value) return;
    setError(null);
    setResult(null);
    setFileName(null);
    setLoading(true);
    try {
      const data = await scanUrl(value);
      setResult(data);
    } catch (err) {
      setError(formatScanError(err));
    } finally {
      setLoading(false);
    }
  }, [urlInput]);

  const onCapture = React.useCallback(
    (photo: CapturedPhoto) => {
      setCameraOpen(false);
      void analyze(photo);
    },
    [analyze]
  );

  const pickFromGallery = React.useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to pick a QR code image.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (!res.canceled && res.assets[0]) {
      const a = res.assets[0];
      void analyze({ uri: a.uri, mimeType: a.mimeType, fileName: a.fileName });
    }
  }, [analyze]);

  return (
    <SafeAreaView className="flex-1 bg-zinc-50 dark:bg-black" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-6 p-5 pb-24"
        keyboardShouldPersistTaps="handled"
      >
        {/* Intro */}
        <View className="gap-2">
          <Text variant="largeTitle">Analyze a QR code safely</Text>
          <Text variant="muted">
            Scan with the camera, pick an image, or paste a link. Our ML model checks the URL for
            phishing and explains the result — we never open the link for you.
          </Text>
        </View>

        {/* Method picker + input */}
        <Card>
          <CardHeader>
            <CardTitle>Choose how to scan</CardTitle>
            <CardDescription>Three ways to check a QR code or link. Max 5&nbsp;MB for images.</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Segmented switcher */}
            <View className="mb-2 flex-row gap-1 rounded-2xl bg-zinc-100 p-1 dark:bg-zinc-800">
              {METHODS.map((m) => {
                const active = method === m.id;
                return (
                  <Pressable
                    key={m.id}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: active }}
                    disabled={loading}
                    onPress={() => setMethod(m.id)}
                    className={cn(
                      // NOTE: avoid NativeWind `shadow-*` here — toggling a
                      // shadow class on an Expo Router screen crashes via
                      // react-native-css-interop (nativewind#1557). A bordered
                      // white pill reads as "selected" without the shadow path.
                      'flex-1 items-center rounded-xl border py-2.5',
                      active
                        ? 'border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-950'
                        : 'border-transparent'
                    )}
                  >
                    <Text
                      className={cn(
                        'text-sm font-semibold',
                        active
                          ? 'text-zinc-900 dark:text-zinc-50'
                          : 'text-zinc-500 dark:text-zinc-400'
                      )}
                    >
                      {m.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {method === 'camera' ? (
              <Button variant="primary" loading={loading} onPress={() => setCameraOpen(true)}>
                <Text>{loading ? 'Analyzing…' : 'Use camera'}</Text>
              </Button>
            ) : null}

            {method === 'gallery' ? (
              <Button variant="secondary" disabled={loading} onPress={() => void pickFromGallery()}>
                <Text>Choose from gallery</Text>
              </Button>
            ) : null}

            {method === 'url' ? (
              <View className="gap-3">
                <TextInput
                  value={urlInput}
                  onChangeText={setUrlInput}
                  editable={!loading}
                  placeholder="https://example.com/login"
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  returnKeyType="go"
                  onSubmitEditing={() => void onUrlSubmit()}
                  className="h-12 rounded-2xl border border-zinc-200 bg-white px-4 text-base text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                />
                <Button
                  variant="primary"
                  loading={loading}
                  disabled={!urlInput.trim()}
                  onPress={() => void onUrlSubmit()}
                >
                  <Text>{loading ? 'Analyzing…' : 'Check link'}</Text>
                </Button>
                <Text variant="footnote" className="text-zinc-500 dark:text-zinc-400">
                  The link is analyzed by the ML model — it is never opened.
                </Text>
              </View>
            ) : null}

            {fileName && method !== 'url' ? (
              <Text variant="footnote" className="font-mono text-zinc-500 dark:text-zinc-400">
                Selected: {fileName}
              </Text>
            ) : null}
          </CardContent>
        </Card>

        {/* Error */}
        {error ? (
          <Card className="border-dangerous/40 bg-dangerous-soft dark:bg-dangerous-softDark">
            <Text variant="heading" className="text-dangerous">
              Error
            </Text>
            <Text className="mt-1 text-dangerous">{error}</Text>
          </Card>
        ) : null}

        {/* Result */}
        {result ? <ScanResultCard result={result} /> : null}
      </ScrollView>

      <QrCamera visible={cameraOpen} onClose={() => setCameraOpen(false)} onCapture={onCapture} />
    </SafeAreaView>
  );
}
