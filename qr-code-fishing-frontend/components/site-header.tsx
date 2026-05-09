import Link from "next/link"

import { PAGE_MAX_CLASS } from "@/lib/layout"
import { cn } from "@/lib/utils"

/**
 * App chrome: title and short tagline. Uses layout typography only (no custom primitives).
 */
export function SiteHeader() {
  return (
    <header className="border-border bg-background/95 supports-backdrop-filter:bg-background/80 w-full border-b backdrop-blur-sm">
      <div className={cn("flex h-14 items-center gap-3", PAGE_MAX_CLASS)}>
        <Link
          href="/"
          className="font-heading text-foreground hover:text-foreground/90 text-base font-medium tracking-tight"
        >
          QR Phishing Detection
        </Link>
        <span className="text-muted-foreground hidden text-sm sm:inline">
          Decode and score links without opening them
        </span>
      </div>
    </header>
  )
}
