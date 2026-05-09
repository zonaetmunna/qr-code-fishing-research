"use client"

import { useCallback, useId, useState } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { QrWebcamDialog } from "@/components/qr-webcam-dialog"
import { PAGE_MAX_CLASS } from "@/lib/layout"
import { getClassificationBadgeProps } from "@/lib/classification-styles"
import {
  formatPayloadKind,
  formatScanError,
  scanQrImage,
  type ScanResult,
} from "@/lib/scan-api"
import { cn } from "@/lib/utils"

function pickImageFile(list: FileList | null): File | undefined {
  if (!list?.length) return undefined
  const f = list[0]
  return f.type.startsWith("image/") ? f : undefined
}

export default function Page() {
  const galleryInputId = useId()
  const cameraInputId = useId()
  const [fileName, setFileName] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [webcamOpen, setWebcamOpen] = useState(false)

  const onFile = useCallback(async (file: File | undefined) => {
    if (!file) return
    setError(null)
    setResult(null)
    setFileName(file.name || "Photo")
    setLoading(true)
    try {
      const data = await scanQrImage(file)
      setResult(data)
    } catch (err: unknown) {
      setError(formatScanError(err))
    } finally {
      setLoading(false)
    }
  }, [])

  const openGallery = useCallback(() => {
    document.getElementById(galleryInputId)?.click()
  }, [galleryInputId])

  const openNativeCameraPicker = useCallback(() => {
    document.getElementById(cameraInputId)?.click()
  }, [cameraInputId])

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      void onFile(pickImageFile(e.target.files))
      e.target.value = ""
    },
    [onFile],
  )

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const onDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      setIsDragging(false)
    }
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)
      const file = pickImageFile(e.dataTransfer.files)
      if (file) void onFile(file)
      else if (e.dataTransfer.files?.length)
        setError("Please drop an image file (PNG, JPG, WebP, …).")
    },
    [onFile],
  )

  const riskBadge =
    result?.link_analysis_applied === true
      ? getClassificationBadgeProps(result.classification)
      : null

  return (
    <div className={cn("flex flex-1 flex-col pb-12 pt-8", PAGE_MAX_CLASS)}>
      <section aria-labelledby="page-title" className="mb-10 space-y-3">
        <h1
          id="page-title"
          className="font-heading text-foreground text-2xl font-semibold tracking-tight md:text-3xl"
        >
          Analyze a QR code safely
        </h1>
        <p className="text-muted-foreground max-w-3xl text-sm leading-relaxed md:text-base">
          Upload a photo or use your phone camera to capture the QR in the room. We
          decode the payload, run lightweight phishing heuristics on web links, and show
          plain-language reasons — we never open the link for you.
        </p>
      </section>

      <div className="grid w-full gap-8 lg:grid-cols-12 lg:items-start lg:gap-10">
        <div className="flex flex-col gap-6 lg:col-span-7">
          <section aria-labelledby="upload-heading">
            <h2 id="upload-heading" className="sr-only">
              Upload QR image
            </h2>
            <Card size="sm">
                <CardHeader>
                <CardTitle>Upload or scan</CardTitle>
                <CardDescription>
                  <strong>Use camera</strong> opens a live preview on PC (requires
                  permission). On phones you can also use <strong>System camera</strong> for
                  the built-in camera app. <strong>Gallery / file</strong> picks an existing
                  image. Max 5&nbsp;MB.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <fieldset
                  className={cn(
                    "m-0 min-w-0 rounded-3xl border border-dashed border-border bg-muted/20 p-0 text-center transition-colors",
                    "flex flex-col items-center justify-center px-6 py-10 md:py-12",
                    isDragging && "border-primary bg-muted/40",
                    loading && "pointer-events-none opacity-60",
                  )}
                  onDragEnter={onDragEnter}
                  onDragLeave={onDragLeave}
                  onDragOver={onDragOver}
                  onDrop={onDrop}
                >
                  <legend className="sr-only">
                    Upload QR code image — drag and drop, camera, or gallery
                  </legend>
                  <div className="max-w-sm flex-col gap-1 text-center">
                    <span className="text-foreground text-sm font-medium">
                      Drop an image here, or use the buttons below
                    </span>
                    <span className="text-muted-foreground text-xs">
                      PC: live webcam in the browser. Phone: system camera app or gallery.
                      HTTPS (or localhost) required for webcam.
                    </span>
                  </div>
                  <Input
                    id={galleryInputId}
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    disabled={loading}
                    onChange={onInputChange}
                    aria-label="Choose QR code image from gallery or files"
                  />
                  <Input
                    id={cameraInputId}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="sr-only"
                    disabled={loading}
                    onChange={onInputChange}
                    aria-label="Take a photo of the QR code with the camera"
                  />
                  <div className="mt-4 flex w-full max-w-sm flex-col gap-2 sm:flex-row sm:justify-center">
                    <Button
                      type="button"
                      variant="default"
                      size="default"
                      className="min-h-11 w-full sm:w-auto"
                      disabled={loading}
                      onClick={() => setWebcamOpen(true)}
                    >
                      {loading ? "Analyzing…" : "Use camera"}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="default"
                      className="min-h-11 w-full sm:w-auto"
                      disabled={loading}
                      onClick={openGallery}
                    >
                      Gallery / file
                    </Button>
                  </div>
                </fieldset>

                {fileName ? (
                  <p className="text-muted-foreground font-mono text-xs">
                    Selected: {fileName}
                  </p>
                ) : null}
              </CardContent>
            </Card>
            <QrWebcamDialog
              open={webcamOpen}
              onOpenChange={setWebcamOpen}
              disabled={loading}
              onPhoto={(file) => void onFile(file)}
              onUseNativePicker={openNativeCameraPicker}
            />
          </section>

          {error ? (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {result ? (
            <section aria-labelledby="result-heading">
              <h2 id="result-heading" className="sr-only">
                Scan result
              </h2>
              <Card size="sm">
                <CardHeader className="border-b pb-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-base">Result</CardTitle>
                    <Badge variant="outline">
                      {formatPayloadKind(result.payload_kind)}
                    </Badge>
                    {riskBadge ? (
                      <Badge variant={riskBadge.variant}>{riskBadge.label}</Badge>
                    ) : null}
                    <span className="text-muted-foreground ml-auto text-xs tabular-nums">
                      {result.link_analysis_applied
                        ? `${result.confidence.toFixed(1)}% link confidence`
                        : "Link scan: n/a"}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <div>
                    <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                      Decoded payload
                    </p>
                    <p className="mt-1 font-mono text-xs break-all sm:text-sm">
                      {result.extracted_url}
                    </p>
                  </div>
                  {result.wifi ? (
                    <div className="bg-muted/40 rounded-2xl border px-3 py-3 text-sm">
                      <p className="text-foreground font-medium">Wi‑Fi details</p>
                      <ul className="text-muted-foreground mt-2 space-y-1 text-xs">
                        <li>Network name (SSID): {result.wifi.ssid || "—"}</li>
                        <li>Security: {result.wifi.security || "—"}</li>
                        <li>Hidden network: {result.wifi.hidden ? "Yes" : "No"}</li>
                        <li>Password: not shown (never stored in clear text)</li>
                      </ul>
                    </div>
                  ) : null}
                  <Separator />
                  <div>
                    <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                      Notes
                    </p>
                    <ul className="text-muted-foreground mt-2 list-inside list-disc space-y-1.5 text-xs leading-relaxed sm:text-sm">
                      {result.indicators.map((ind) => (
                        <li key={ind}>{ind}</li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </section>
          ) : null}
        </div>

        <aside className="flex flex-col gap-6 lg:col-span-5">
          <section aria-labelledby="how-heading">
            <Card size="sm" className="h-full">
              <CardHeader>
                <CardTitle id="how-heading">How it works</CardTitle>
                <CardDescription>Three steps from image to insight.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <ol className="text-muted-foreground list-inside list-decimal space-y-3 leading-relaxed">
                  <li>
                    <span className="text-foreground font-medium">Decode</span> — We read
                    the QR payload from your file or camera photo (web links, Wi‑Fi, text,
                    etc.); nothing is opened in a browser.
                  </li>
                  <li>
                    <span className="text-foreground font-medium">Score</span> — For http(s)
                    links only, heuristics check HTTPS, host shape, TLDs, and common phishing
                    patterns.
                  </li>
                  <li>
                    <span className="text-foreground font-medium">Explain</span> — You get
                    a tier (safe / risky / dangerous), a confidence score, and reasons.
                  </li>
                </ol>
              </CardContent>
            </Card>
          </section>

          <section aria-labelledby="signals-heading">
            <Card size="sm" className="h-full">
              <CardHeader>
                <CardTitle id="signals-heading">What we look at</CardTitle>
                <CardDescription>
                  Examples of signals in the current phase-1 rules.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-muted-foreground space-y-2 text-sm leading-relaxed">
                  <li className="flex gap-2">
                    <span className="text-foreground shrink-0">·</span>
                    <span>HTTP vs HTTPS and raw IP hosts</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-foreground shrink-0">·</span>
                    <span>Suspicious TLDs and deep subdomain chains</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-foreground shrink-0">·</span>
                    <span>
                      Userinfo patterns (e.g. <code className="text-foreground font-mono text-xs">@</code>{" "}
                      tricks) and trusted-brand relief heuristics
                    </span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </section>
        </aside>
      </div>
    </div>
  )
}
