/**
 * components/axiom-logo.tsx
 *
 * Mark concept: two angular chevrons (< >) enclosing a single verification
 * dot — reads as "review", "inspect", "validate". No shields, no locks,
 * no chains, no generic crypto imagery.
 *
 * The mark works at 20px (favicon territory) through 48px (hero).
 * The wordmark is optional via the `showWordmark` prop.
 */

interface AxiomLogoProps {
  /** Height of the mark in px. Width scales proportionally. Default: 28 */
  size?: number
  /** Show the "Axiom" wordmark beside the mark. Default: true */
  showWordmark?: boolean
  className?: string
}

export function AxiomLogo({
  size = 28,
  showWordmark = true,
  className = "",
}: AxiomLogoProps) {
  return (
    <span
      className={`inline-flex items-center gap-2.5 select-none ${className}`}
      aria-label="Axiom"
    >
      {/* ── Mark ── */}
      <AxiomMark size={size} />

      {/* ── Wordmark ── */}
      {showWordmark && (
        <span
          className="font-semibold tracking-tight text-foreground"
          style={{ fontSize: size * 0.64, lineHeight: 1 }}
        >
          Axiom
        </span>
      )}
    </span>
  )
}

interface MarkProps {
  size: number
}

export function AxiomMark({ size }: MarkProps) {
  // Viewbox is 24×24. We scale via width/height.
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/*
        Left chevron  — angled bracket pointing left
        Stroke: primary colour at full opacity
      */}
      <polyline
        points="9,5 4,12 9,19"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-primary"
      />

      {/*
        Right chevron — angled bracket pointing right
        Stroke: primary colour at 55% opacity — creates depth
      */}
      <polyline
        points="15,5 20,12 15,19"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-primary"
        opacity="0.55"
      />

      {/*
        Centre verification dot
        Small filled circle — the "signal" being reviewed
      */}
      <circle
        cx="12"
        cy="12"
        r="1.5"
        fill="currentColor"
        className="text-primary"
      />
    </svg>
  )
}