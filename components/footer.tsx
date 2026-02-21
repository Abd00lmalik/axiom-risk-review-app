"use client"

import { useState } from "react"
import { DisclaimerModal } from "@/components/disclaimer-modal"

// Re-opens the full modal on demand
// This uses a local state to bypass the localStorage gate
function DisclaimerRepeat() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="underline underline-offset-2 hover:text-foreground transition-colors"
      >
        full disclaimer
      </button>

      {open && (
        <DisclaimerModalForced onClose={() => setOpen(false)} />
      )}
    </>
  )
}

// Variant of DisclaimerModal that ignores localStorage gate
// and accepts an external close handler
function DisclaimerModalForced({ onClose }: { onClose: () => void }) {
  return (
    // Mount a fresh modal — reuses all styling
    // We pass a key so it remounts each time
    <ForcedModal onClose={onClose} />
  )
}

// Inline forced modal (avoids duplicating the full modal component)
import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"

function ForcedModal({ onClose }: { onClose: () => void }) {
  return (
    <AnimatePresence>
      <motion.div
        key="backdrop-forced"
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        aria-hidden="true"
      />
      <motion.div
        key="dialog-forced"
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.2 }}
      >
        <div className="relative w-full max-w-lg rounded-2xl border border-border/60 bg-card/95 backdrop-blur-xl shadow-2xl">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="p-6 pb-5">
            <h2 className="text-base font-semibold text-foreground mb-1">
              Informational Use Only
            </h2>
            <div className="max-h-64 overflow-y-auto pr-1 space-y-3 text-xs text-muted-foreground leading-relaxed">
              <p>
                <span className="font-semibold text-foreground">Axiom Risk Review</span>{" "}
                is an experimental research tool that surfaces publicly available information
                about crypto and blockchain projects using AI-assisted analysis and
                decentralized validator consensus. It is provided strictly for informational
                and educational purposes.
              </p>
              <p>
                <span className="font-semibold text-foreground">Not financial, legal, or investment advice.</span>{" "}
                Nothing produced by this tool constitutes financial advice, investment
                recommendations, legal counsel, or an endorsement or condemnation of any
                project, token, protocol, or team.
              </p>
              <p>
                <span className="font-semibold text-foreground">Not an audit or verification.</span>{" "}
                Outputs are not security audits, code reviews, or formal verifications.
                They do not represent findings of licensed auditors or certified professionals.
              </p>
              <p>
                <span className="font-semibold text-foreground">AI-generated signals.</span>{" "}
                Analysis is performed using AI language models that search and interpret
                publicly available sources. These models may produce inaccurate, incomplete,
                or misleading outputs. UNKNOWN signals reflect insufficient public information.
              </p>
              <p>
                <span className="font-semibold text-foreground">No guarantees of accuracy.</span>{" "}
                We make no representations about the accuracy, completeness, or reliability
                of information produced. Results may be incorrect, outdated, or based on
                misinterpreted sources.
              </p>
              <p>
                <span className="font-semibold text-foreground">Limitation of liability.</span>{" "}
                To the maximum extent permitted by law, Axiom and its contributors disclaim
                all liability for damages arising from use of or reliance on this tool.
              </p>
            </div>
          </div>

          <div className="border-t border-border/40 px-6 py-4">
            <Button onClick={onClose} className="w-full" size="sm">
              Close
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Footer
// ─────────────────────────────────────────────────────────────────────────────

export function Footer() {
  return (
    <footer className="relative z-10 border-t border-border/30 bg-background/40 backdrop-blur-sm">
      <div className="mx-auto max-w-2xl px-4 py-5">
        <p className="text-center text-[11px] text-muted-foreground/70 leading-relaxed">
          Axiom Risk Review is an experimental informational tool. Outputs are AI-generated
          from public sources and do not constitute financial advice, investment
          recommendations, or security audits. Results may be inaccurate or incomplete.{" "}
          <DisclaimerRepeat /> — Use at your own risk.
        </p>
      </div>
    </footer>
  )
}