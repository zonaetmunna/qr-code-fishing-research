import { PAGE_MAX_CLASS } from "@/lib/layout"
import { cn } from "@/lib/utils"

/**
 * App footer: copyright and research disclaimer.
 */
export function SiteFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-border bg-background mt-auto w-full border-t">
      <div className={cn("py-8", PAGE_MAX_CLASS)}>
        <p className="text-muted-foreground text-center text-xs leading-relaxed">
          © {year} QR Phishing Detection · Phase-1 heuristic analysis — not legal or
          security advice. Replace rules with threat intel or ML for production use.
        </p>
      </div>
    </footer>
  )
}
