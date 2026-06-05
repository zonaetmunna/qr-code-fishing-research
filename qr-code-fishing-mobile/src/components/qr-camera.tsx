import { CameraView, useCameraPermissions } from 'expo-camera';
import * as React from 'react';
import { Modal, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

export type CapturedPhoto = {
  uri: string;
  mimeType: string;
  fileName: string;
};

type QrCameraProps = {
  visible: boolean;
  onClose: () => void;
  onCapture: (photo: CapturedPhoto) => void;
};

/**
 * Full-screen camera modal. Captures a still image (JPEG) and hands the file
 * URI back to the caller — the backend does the actual QR decode + analysis,
 * so we only need a clear photo, not on-device barcode detection.
 */
export function QrCamera({ visible, onClose, onCapture }: QrCameraProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = React.useRef<CameraView>(null);
  const [busy, setBusy] = React.useState(false);

  const takePhoto = React.useCallback(async () => {
    if (!cameraRef.current || busy) return;
    setBusy(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.9 });
      if (photo?.uri) {
        onCapture({ uri: photo.uri, mimeType: 'image/jpeg', fileName: 'camera-qr.jpg' });
      }
    } finally {
      setBusy(false);
    }
  }, [busy, onCapture]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black">
        {!permission ? (
          // Permissions still loading.
          <SafeAreaView className="flex-1 items-center justify-center px-8">
            <Text className="text-center text-white">Preparing camera…</Text>
          </SafeAreaView>
        ) : !permission.granted ? (
          <SafeAreaView className="flex-1 items-center justify-center gap-4 px-8">
            <Text variant="title3" className="text-center text-white">
              Camera access needed
            </Text>
            <Text className="text-center text-zinc-300">
              Allow camera access to capture a QR code for analysis.
            </Text>
            <Button variant="primary" onPress={requestPermission}>
              <Text>Grant permission</Text>
            </Button>
            <Button variant="plain" onPress={onClose}>
              <Text className="text-zinc-300">Cancel</Text>
            </Button>
          </SafeAreaView>
        ) : (
          <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back">
            <SafeAreaView className="flex-1 justify-between">
              {/* Top bar */}
              <View className="flex-row justify-end p-4">
                <Pressable
                  accessibilityRole="button"
                  onPress={onClose}
                  className="h-10 w-10 items-center justify-center rounded-full bg-black/50"
                >
                  <Text className="text-lg text-white">✕</Text>
                </Pressable>
              </View>

              {/* Framing guide */}
              <View className="items-center justify-center">
                <View className="h-60 w-60 rounded-3xl border-2 border-white/80" />
                <Text className="mt-4 text-center text-sm text-white/90">
                  Center the QR code in the frame
                </Text>
              </View>

              {/* Capture button */}
              <View className="items-center p-8">
                <Button
                  variant="primary"
                  size="lg"
                  loading={busy}
                  onPress={takePhoto}
                  className="w-full"
                >
                  <Text>{busy ? 'Capturing…' : 'Capture'}</Text>
                </Button>
              </View>
            </SafeAreaView>
          </CameraView>
        )}
      </View>
    </Modal>
  );
}
