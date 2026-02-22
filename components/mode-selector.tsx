"use client"

import { motion } from "framer-motion"
import { Zap, Eye, Lock, ShieldCheck } from "lucide-react"

export type AnalysisMode = "verified" | "preview"

interface ModeSelectorProps {
  mode: AnalysisMode
  onModeChange: (mode: AnalysisMode) => void
  previewUsed: boolean
}

export function ModeSelector({ mode, onModeChange, previewUsed }: ModeSelectorProps) {
  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-lg mx-auto px-4 mb-2">
      <div
        className="relative w-full flex rounded-xl p-1 border border-border/50"
        style={{ background: "hsl(220 28% 6% / 0.8)", backdropFilter: "blur(16px)" }}
      >
        <motion.div
          className="absolute inset-y-1 rounded-lg"
          animate={{
            left:  mode === "verified" ? "4px" : "50%",
            right: mode === "verified" ? "50%"  : "4px",
          }}
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
          style={{
            background: mode === "verified"
              ? "linear-gradient(135deg, hsl(197 100% 47% / 0.12), hsl(213 94% 60% / 0.06))"
              : "linear-gradient(135deg, hsl(38 92% 50% / 0.1), hsl(38 92% 50% / 0.04))",
            border: mode === "verified"
              ? "1px solid hsl(197 100% 47% / 0.25)"
              : "1px solid hsl(38 92% 50% / 0.2)",
            boxShadow: mode === "verified"
              ? "0 0 20px hsl(197 100% 47% / 0.1), inset 0 1px 0 hsl(197 100% 47% / 0.08)"
              : "0 0 20px hsl(38 92% 50% / 0.08)",
          }}
        />

        <button
          onClick={() => onModeChange("verified")}
          className={`relative z-10 flex flex-1 items-center justify-center gap-2 rounded-lg py-3 px-4
            text-sm transition-colors duration-200
            ${mode === "verified" ? "text-foreground" : "text-muted-foreground hover:text-foreground/70"}`}
          style={{ fontFamily: "'Syne', system-ui, sans-serif", fontWeight: 600 }}
        >
          <Zap className={`h-3.5 w-3.5 shrink-0 ${mode === "verified" ? "text-cyan-400" : ""}`} />
          On-Chain Verified
          {mode === "verified" && <ShieldCheck className="h-3 w-3 text-cyan-400 ml-0.5" />}
        </button>

        <button
          onClick={() => !previewUsed && onModeChange("preview")}
          disabled={previewUsed}
          title={previewUsed ? "Preview used — use On-Chain Verified mode" : undefined}
          className={`relative z-10 flex flex-1 items-center justify-center gap-2 rounded-lg py-3 px-4
            text-sm transition-colors duration-200
            ${previewUsed
              ? "text-muted-foreground/30 cursor-not-allowed"
              : mode === "preview"
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground/70"}`}
          style={{ fontFamily: "'Syne', system-ui, sans-serif", fontWeight: 600 }}
        >
          {previewUsed
            ? <Lock className="h-3.5 w-3.5 shrink-0" />
            : <Eye className={`h-3.5 w-3.5 shrink-0 ${mode === "preview" ? "text-amber-400" : ""}`} />
          }
          AI Preview
          {previewUsed && <span className="text-[9px] font-mono opacity-40 ml-1 tracking-widest">USED</span>}
        </button>
      </div>

      <motion.p
        key={mode}
        initial={{ opacity: 0, y: 3 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="text-[11px] font-mono text-muted-foreground tracking-wide text-center"
      >
        {mode === "verified"
          ? <><span className="text-cyan-500/60">▸ </span>Validator consensus · On-chain record · Wallet required · ~5 min</>
          : <><span className="text-amber-500/60">▸ </span>AI-only · Off-chain · No wallet · One use · <span className="text-amber-500/70">Not verified</span></>
        }
      </motion.p>
    </div>
  )
}