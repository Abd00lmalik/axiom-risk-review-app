"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"

const SEEN_KEY = "axiom_disclaimer_v1"

export function DisclaimerModal() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    try {
      const seen = window.localStorage.getItem(SEEN_KEY)
      if (!seen) setOpen(true)
    } catch {
      // localStorage blocked — show once, don't persist
      setOpen(true)
    }
  }, [])

  function dismiss() {
    try {
      window.localStorage.setItem(SEEN_KEY, "1")
    } catch {
      // ignore
    }
    setOpen(false)
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={dismiss}
            aria-hidden="true"
          />

          {/* Dialog */}
          <motion.div
            key="dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="disclaimer-title"
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.2 }}
          >
            <div className="relative w-full max-w-lg rounded-2xl border border-border/60 bg-card/95 backdrop-blur-xl shadow-2xl">
              {/* Close */}
              <button
                onClick={dismiss}
                className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="p-6 pb-5">
                <h2
                  id="disclaimer-title"
                  className="text-base font-semibold text-foreground mb-1"
                >
                  Informational Use Only
                </h2>
                <p className="text-xs text-muted-foreground mb-4">
                  Please read before using this tool.
                </p>

                <div className="max-h-64 overflow-y-auto pr-1 space-y-3 text-xs text-muted-foreground leading-relaxed custom-scrollbar">

                  <p>
                    <span className="font-semibold text-foreground">
                      Axiom Risk Review
                    </span>{" "}
                    is an experimental research tool that surfaces publicly
                    available information about crypto and blockchain projects
                    using AI-assisted analysis and decentralized validator
                    consensus. It is provided strictly for informational and
                    educational purposes.
                  </p>

                  <p>
                    <span className="font-semibold text-foreground">
                      Not financial, legal, or investment advice.
                    </span>{" "}
                    Nothing produced by this tool constitutes financial advice,
                    investment recommendations, legal counsel, or an endorsement
                    or condemnation of any project, token, protocol, or team.
                    You should not rely on any output from this tool when making
                    investment, trading, or financial decisions.
                  </p>

                  <p>
                    <span className="font-semibold text-foreground">
                      Not an audit or verification.
                    </span>{" "}
                    Outputs are not security audits, code reviews, or formal
                    verifications. They do not represent the findings of licensed
                    auditors, legal professionals, or certified financial
                    analysts.
                  </p>

                  <p>
                    <span className="font-semibold text-foreground">
                      AI-generated signals.
                    </span>{" "}
                    Analysis is performed using AI language models that search
                    and interpret publicly available sources. These models may
                    produce inaccurate, incomplete, outdated, or misleading
                    outputs. Signals marked{" "}
                    <span className="font-medium text-foreground">UNKNOWN</span>{" "}
                    reflect genuinely insufficient public information and should
                    not be interpreted as confirmation or denial of any claim.
                  </p>

                  <p>
                    <span className="font-semibold text-foreground">
                      Public sources only.
                    </span>{" "}
                    All analysis is derived exclusively from publicly available
                    information including websites, documentation, social media,
                    published reports, and open-source repositories. This tool
                    does not access private, confidential, or proprietary data.
                  </p>

                  <p>
                    <span className="font-semibold text-foreground">
                      No guarantees of accuracy.
                    </span>{" "}
                    We make no representations or warranties, express or implied,
                    about the accuracy, completeness, reliability, or fitness for
                    any purpose of the information produced. Results may be
                    incorrect, outdated, or based on misinterpreted sources.
                  </p>

                  <p>
                    <span className="font-semibold text-foreground">
                      Limitation of liability.
                    </span>{" "}
                    To the maximum extent permitted by applicable law, Axiom and
                    its contributors disclaim all liability for any direct,
                    indirect, incidental, or consequential damages arising from
                    use of or reliance on this tool or its outputs.
                  </p>

                  <p>
                    By using this tool, you acknowledge that you have read,
                    understood, and accepted these terms.
                  </p>
                </div>
              </div>

              <div className="border-t border-border/40 px-6 py-4">
                <Button onClick={dismiss} className="w-full" size="sm">
                  I understand — continue
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}