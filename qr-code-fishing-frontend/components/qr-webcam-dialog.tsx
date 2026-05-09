"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type QrWebcamDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called with a JPEG still when the user captures. */
  onPhoto: (file: File) => void
  /** When webcam is unavailable, user can fall back to the hidden file input (e.g. mobile native camera). */
  onUseNativePicker: () => void
  disabled?: boolean
}

/**
 * Opens the device webcam via getUserMedia (works on most desktop browsers over HTTPS
 * or localhost). Mobile browsers can use this too; ``onUseNativePicker`` keeps the
 * old file+capture path as a fallback.
 */
export function QrWebcamDialog({
  open,
  onOpenChange,
  onPhoto,
  onUseNativePicker,
  disabled = false,
}: QrWebcamDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  const stopStream = useCallback(() => {
    for (const t of streamRef.current?.getTracks() ?? []) {
      t.stop()
    }
    streamRef.current = null
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setReady(false)
  }, [])

  useEffect(() => {
    if (!open) {
      stopStream()
      setError(null)
      return
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setError(
        "This browser does not support camera access from the page. Use “System camera” or upload a file.",
      )
      return
    }

    if (typeof window !== "undefined" && !window.isSecureContext) {
      setError(
        "Camera requires HTTPS (or localhost). Open the site over HTTPS, or use “Gallery / file”.",
      )
      return
    }

    let cancelled = false
    setError(null)

    async function start() {
      const tryVideo = async (constraints: MediaStreamConstraints) =>
        navigator.mediaDevices.getUserMedia(constraints)

      try {
        const stream = await tryVideo({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        }).catch(() =>
          tryVideo({ video: true, audio: false }),
        )
        if (cancelled) {
          for (const t of stream.getTracks()) {
            t.stop()
          }
          return
        }
        streamRef.current = stream
        const v = videoRef.current
        if (v) {
          v.srcObject = stream
          await v.play().catch(() => {})
        }
        setReady(true)
      } catch (e: unknown) {
        const name = e instanceof DOMException ? e.name : ""
        if (name === "NotAllowedError" || name === "PermissionDeniedError") {
          setError("Camera permission was blocked. Allow camera for this site, or use “System camera” below.")
        } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
          setError("No camera found. Connect a webcam or use “Gallery / file”.")
        } else {
          setError("Could not start the camera. Try “System camera” or upload an image.")
        }
      }
    }

    void start()

    return () => {
      cancelled = true
      stopStream()
    }
  }, [open, stopStream])

  const capture = useCallback(() => {
    const video = videoRef.current
    if (!video || video.videoWidth < 2) return

    const canvas = document.createElement("canvas")
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.drawImage(video, 0, 0)

    canvas.toBlob(
      (blob) => {
        if (!blob) return
        const file = new File([blob], "qr-webcam.jpg", {
          type: "image/jpeg",
        })
        stopStream()
        onOpenChange(false)
        onPhoto(file)
      },
      "image/jpeg",
      0.92,
    )
  }, [onOpenChange, onPhoto, stopStream])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton>
        <DialogHeader>
          <DialogTitle>Camera</DialogTitle>
          <DialogDescription>
            Point at the QR code, then capture. On phones you can also use “System
            camera” for the built-in camera app.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-muted relative aspect-video w-full overflow-hidden rounded-2xl">
          <video
            ref={videoRef}
            className="size-full object-cover"
            playsInline
            muted
            autoPlay
            aria-label="Camera preview"
          />
          {!ready && !error ? (
            <p className="text-muted-foreground absolute inset-0 flex items-center justify-center text-sm">
              Starting camera…
            </p>
          ) : null}
        </div>

        {error ? (
          <p className="text-destructive text-sm leading-relaxed" role="alert">
            {error}
          </p>
        ) : null}

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onOpenChange(false)
              onUseNativePicker()
            }}
          >
            System camera
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={capture}
              disabled={disabled || !ready || !!error}
            >
              Capture photo
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
