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
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { QrWebcamDialog } from "@/components/qr-webcam-dialog"
import { PAGE_MAX_CLASS } from "@/lib/layout"
import { getClassificationBanner } from "@/lib/classification-styles"
import {
  formatPayloadKind,
  formatScanError,
  scanQrImage,
  scanUrl,
  type ScanResult,
} from "@/lib/scan-api"
import { cn } from "@/lib/utils"

type Method = "upload" | "camera" | "url"

const METHODS: { id: Method; label: string; icon: string }[] = [
  { id: "upload", label: "Upload", icon: "📁" },
  { id: "camera", label: "Camera", icon: "📷" },
  { id: "url", label: "URL", icon: "🔗" },
]

function pickImageFile(list: FileList | null): File | undefined {
  if (!list?.length) return undefined
  const f = list[0]
  return f.type.startsWith("image/") ? f : undefined
}

/** Ensure the decoded URL has a scheme before opening it. */
function toHref(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`
}

export default function Page() {
  const galleryInputId = useId()
  const cameraInputId = useId()
  const [method, setMethod] = useState<Method>("upload")
  const [fileName, setFileName] = useState<string | null>(null)
  const [urlInput, setUrlInput] = useState("")
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

  const onUrlSubmit = useCallback(async () => {
    const value = urlInput.trim()
    if (!value) return
    setError(null)
    setResult(null)
    setLoading(true)
    try {
      const data = await scanUrl(value)
      setResult(data)
    } catch (err: unknown) {
      setError(formatScanError(err))
    } finally {
      setLoading(false)
    }
  }, [urlInput])

  const reset = useCallback(() => {
    setResult(null)
    setError(null)
    setFileName(null)
    setUrlInput("")
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

  const banner =
    result?.link_analysis_applied === true
      ? getClassificationBanner(result.classification)
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
          Upload an image, scan with your camera, or paste a link. Our ML model
          checks the URL for phishing and shows plain-language reasons — we never open
          the link for you.
        </p>
      </section>

      <div className="grid w-full gap-8 lg:grid-cols-12 lg:items-start lg:gap-10">
        <div className="flex flex-col gap-6 lg:col-span-7">
          <section aria-labelledby="upload-heading">
            <h2 id="upload-heading" className="sr-only">
              Analyze a QR code
            </h2>
            <Card size="sm">
              <CardHeader>
                <CardTitle>Choose how to scan</CardTitle>
                <CardDescription>
                  Three ways to check a QR code or link. Max 5&nbsp;MB for images.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Segmented method switcher */}
                <div
                  role="tablist"
                  aria-label="Scan method"
                  className="bg-muted/40 grid grid-cols-3 gap-1 rounded-2xl p-1"
                >
                  {METHODS.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      role="tab"
                      aria-selected={method === m.id}
                      disabled={loading}
                      onClick={() => setMethod(m.id)}
                      className={cn(
                        "flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                        method === m.id
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <span aria-hidden>{m.icon}</span>
                      {m.label}
                    </button>
                  ))}
                </div>

                {/* Panel: Upload (drag-drop + gallery) */}
                {method === "upload" ? (
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
                      Upload QR code image — drag and drop or pick a file
                    </legend>
                    <div className="max-w-sm flex-col gap-1 text-center">
                      <span className="text-foreground block text-sm font-medium">
                        Drag &amp; drop an image here
                      </span>
                      <span className="text-muted-foreground text-xs">
                        or pick one from your files — PNG, JPG, WebP
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
                    <Button
                      type="button"
                      variant="secondary"
                      className="mt-4 min-h-11 w-full max-w-xs"
                      disabled={loading}
                      onClick={openGallery}
                    >
                      {loading ? "Analyzing…" : "Choose image"}
                    </Button>
                  </fieldset>
                ) : null}

                {/* Panel: Camera */}
                {method === "camera" ? (
                  <div className="rounded-3xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center md:py-12">
                    <p className="text-foreground text-sm font-medium">
                      Scan with your camera
                    </p>
                    <p className="text-muted-foreground mx-auto mt-1 max-w-sm text-xs">
                      Opens a live preview (needs camera permission; HTTPS or localhost).
                      On phones you can also use the system camera app.
                    </p>
                    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
                      <Button
                        type="button"
                        className="min-h-11 sm:w-auto"
                        disabled={loading}
                        onClick={() => setWebcamOpen(true)}
                      >
                        {loading ? "Analyzing…" : "Open camera"}
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        className="min-h-11 sm:w-auto"
                        disabled={loading}
                        onClick={openNativeCameraPicker}
                      >
                        System camera
                      </Button>
                    </div>
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
                  </div>
                ) : null}

                {/* Panel: URL input */}
                {method === "url" ? (
                  <form
                    className="space-y-3"
                    onSubmit={(e) => {
                      e.preventDefault()
                      void onUrlSubmit()
                    }}
                  >
                    <div className="space-y-1.5">
                      <Label htmlFor="url-input">Paste a link to check</Label>
                      <Input
                        id="url-input"
                        type="text"
                        inputMode="url"
                        placeholder="https://example.com/login"
                        value={urlInput}
                        disabled={loading}
                        onChange={(e) => setUrlInput(e.target.value)}
                        autoComplete="off"
                      />
                    </div>
                    <Button
                      type="submit"
                      className="min-h-11 w-full"
                      disabled={loading || !urlInput.trim()}
                    >
                      {loading ? "Analyzing…" : "Check link"}
                    </Button>
                    <p className="text-muted-foreground text-xs">
                      The link is analyzed by the ML model — it is never opened.
                    </p>
                  </form>
                ) : null}

                {fileName && method !== "url" ? (
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

          {loading && !result ? (
            <Card size="sm">
              <CardContent className="flex items-center gap-3 py-8">
                <span
                  className="border-muted-foreground/40 border-t-foreground size-5 animate-spin rounded-full border-2"
                  aria-hidden
                />
                <span className="text-muted-foreground text-sm">
                  Analyzing with the ML model…
                </span>
              </CardContent>
            </Card>
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
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="ml-auto h-8"
                      onClick={reset}
                    >
                      Scan another
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  {/* Big verdict banner */}
                  {banner ? (
                    <div
                      className={cn(
                        "flex items-start gap-3 rounded-2xl border p-4",
                        banner.container,
                      )}
                    >
                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-current/15 text-lg font-bold">
                        {banner.icon}
                      </span>
                      <div className="min-w-0">
                        <p className="text-base font-semibold leading-tight">
                          {banner.label}
                        </p>
                        <p className="text-sm opacity-90">{banner.meaning}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-muted/40 text-muted-foreground rounded-2xl border px-4 py-3 text-sm">
                      This QR isn’t a web link, so phishing scoring doesn’t apply.
                    </div>
                  )}

                  {/* Confidence meter */}
                  {banner ? (
                    <div className="space-y-1.5">
                      <div className="text-muted-foreground flex justify-between text-xs font-medium">
                        <span>Model confidence</span>
                        <span className="tabular-nums">
                          {result.confidence.toFixed(0)}%
                        </span>
                      </div>
                      <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
                        <div
                          className={cn("h-full rounded-full", banner.bar)}
                          style={{ width: `${Math.min(100, Math.max(0, result.confidence))}%` }}
                        />
                      </div>
                    </div>
                  ) : null}

                  <div>
                    <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                      Decoded payload
                    </p>
                    <p className="mt-1 font-mono text-xs break-all sm:text-sm">
                      {result.extracted_url}
                    </p>
                  </div>

                  {/* Open the destination (the user decides) */}
                  {result.payload_kind === "url" ? (
                    <div className="space-y-1.5">
                      <Button
                        type="button"
                        variant={
                          result.classification === "safe" ? "default" : "destructive"
                        }
                        className="w-full"
                        onClick={() =>
                          window.open(
                            toHref(result.extracted_url),
                            "_blank",
                            "noopener,noreferrer",
                          )
                        }
                      >
                        {result.classification === "safe"
                          ? "Open link ↗"
                          : "Open anyway ↗"}
                      </Button>
                      {result.classification !== "safe" ? (
                        <p className="text-muted-foreground text-xs">
                          We flagged this link — only open it if you are sure it’s genuine.
                        </p>
                      ) : null}
                    </div>
                  ) : null}
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
                    the QR payload from your image, camera, or pasted link (web links,
                    Wi‑Fi, text, etc.); nothing is opened in a browser.
                  </li>
                  <li>
                    <span className="text-foreground font-medium">Score</span> — For http(s)
                    links, an ML model estimates the phishing risk and rules add extra
                    warnings.
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
                  Signals behind the verdict.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-muted-foreground space-y-2 text-sm leading-relaxed">
                  <li className="flex gap-2">
                    <span className="text-foreground shrink-0">·</span>
                    <span>ML phishing risk score on the decoded URL</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-foreground shrink-0">·</span>
                    <span>HTTP vs HTTPS, raw IP hosts, suspicious TLDs</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-foreground shrink-0">·</span>
                    <span>
                      Userinfo <code className="text-foreground font-mono text-xs">@</code>{" "}
                      tricks and trusted-brand safety checks
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
