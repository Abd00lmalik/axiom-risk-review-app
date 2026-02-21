"use client"

/**
 * components/mode-selector.tsx
 *
 * Mode switcher between AI Preview and On-Chain Verified.
 *
 * Design rules:
 * - GenLayer Verified is visually primary (left, full colour)
 * - Preview is secondary (right, muted when used)
 * - When preview is exhausted, the tab is still visible but disabled
 *   with a clear "Used" label — transparency over hiding
 */

import { motion } from "framer-motion"
import { Zap, Eye, CheckCircle2, Lock } from "lucide-react"

export type AnalysisMode = "verified" | "preview"

interface ModeSelectorProps {
  mode: AnalysisMode
  onModeChange: (mode: AnalysisMode) => void
  previewUsed: boolean  // comes from PreviewGate.isUsed(), read in useEffect
}

export function ModeSelector({
  mode,
  onModeChange,
  previewUsed,
}: ModeSelectorProps) {
  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-lg mx-auto px-4 mb-1">
      {/* Tab row */}
      <div className="relative flex w-full rounded-xl border border-border/50 bg-secondary/30 p-1 backdrop-blur-sm">

        {/* Sliding indicator */}
        <motion.div
          className="absolute inset-y-1 rounded-lg bg-card border border-border/60 shadow-sm"
          animate={{
            left:  mode === "verified" ? "4px" : "50%",
            right: mode === "verified" ? "50%"  : "4px",
          }}
          transition={{ type: "spring", stiffness: 400, damping: 35 }}
        />

        {/* Verified tab */}
        <button
          onClick={() => onModeChange("verified")}
          className={`
            relative z-10 flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 px-3
            text-sm font-medium transition-colors duration-150
            ${mode === "verified"
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground/70"
            }
          `}
        >
          <Zap className="h-3.5 w-3.5 shrink-0" />
          <span>On-Chain Verified</span>
          {mode === "verified" && (
            <CheckCircle2 className="h-3 w-3 text-primary ml-0.5" />
          )}
        </button>

        {/* Preview tab */}
        <button
          onClick={() => !previewUsed && onModeChange("preview")}
          disabled={previewUsed}
          className={`
            relative z-10 flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 px-3
            text-sm font-medium transition-colors duration-150
            ${previewUsed
              ? "text-muted-foreground/40 cursor-not-allowed"
              : mode === "preview"
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground/70"
            }
          `}
          title={previewUsed ? "AI Preview has already been used. Use On-Chain Verified mode for your next analysis." : undefined}
        >
          {previewUsed ? (
            <Lock className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <Eye className="h-3.5 w-3.5 shrink-0" />
          )}
          <span>AI Preview</span>
          {previewUsed && (
            <span className="text-[10px] font-normal ml-0.5 opacity-60">(used)</span>
          )}
        </button>
      </div>

      {/* Contextual description */}
      <motion.p
        key={mode}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="text-center text-[11px] text-muted-foreground/70 leading-relaxed"
      >
        {mode === "verified" ? (
          <>
            Results are validated by GenLayer consensus and stored on-chain.
            Requires wallet — takes several minutes.
          </>
        ) : (
          <>
            Instant AI-only analysis from public sources.{" "}
            <span className="text-amber-500/80 font-medium">Not validator-confirmed.</span>{" "}
            One use only.
          </>
        )}
      </motion.p>
    </div>
  )
}