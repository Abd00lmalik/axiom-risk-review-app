"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Navbar } from "@/components/navbar"
import { Hero } from "@/components/hero"
import { ModeSelector, type AnalysisMode } from "@/components/mode-selector"
import { AnalyzeCard } from "@/components/analyze-card"
import { RiskReport } from "@/components/risk-report"
import { AnimatedBackground } from "@/components/animated-background"
import { PreviewGate } from "@/lib/preview-gate"
import type { RiskReportResult } from "@/lib/types"

export default function Page() {
  const [mode, setMode]               = useState<AnalysisMode>("verified")
  const [previewUsed, setPreviewUsed] = useState(false)
  const [report, setReport]           = useState<RiskReportResult | null>(null)
  const [reportMode, setReportMode]   = useState<AnalysisMode>("verified")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const reportRef                     = useRef<HTMLDivElement>(null)

  // Hydration-safe: read localStorage only after mount
  useEffect(() => {
    setPreviewUsed(PreviewGate.isUsed())
  }, [])

  const handleResult = useCallback(
    (result: RiskReportResult, resultMode: AnalysisMode) => {
      setReport(result)
      setReportMode(resultMode)
      setTimeout(() => {
        reportRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
      }, 200)
    },
    []
  )

  const handlePreviewUsed = useCallback(() => {
    setPreviewUsed(true)
    setMode("verified")
  }, [])

  const handleModeChange = useCallback((newMode: AnalysisMode) => {
    if (newMode === "preview" && previewUsed) return
    setMode(newMode)
    setReport(null)
  }, [previewUsed])

  const handleRequestVerified = useCallback(() => {
    setMode("verified")
    setReport(null)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [])

  return (
    <main className="relative min-h-screen overflow-x-hidden">
      <AnimatedBackground />
      <Navbar />

      <div className="relative z-10">
        <Hero />

        <section className="pb-4">
          <ModeSelector
            mode={mode}
            onModeChange={handleModeChange}
            previewUsed={previewUsed}
          />
        </section>

        <section className="pb-8">
          <AnalyzeCard
            mode={mode}
            onResult={handleResult}
            onPreviewUsed={handlePreviewUsed}
            isAnalyzing={isAnalyzing}
            setIsAnalyzing={setIsAnalyzing}
          />
        </section>

        <AnimatePresence>
          {report && !isAnalyzing && (
            <motion.section
              ref={reportRef}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-4 pb-16 pt-4"
            >
              <RiskReport
                report={report}
                mode={reportMode}
                onRequestVerified={
                  reportMode === "preview" ? handleRequestVerified : undefined
                }
              />
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </main>
  )
}