"use client"

import { useState, useRef, useCallback } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Navbar } from "@/components/navbar"
import { Hero } from "@/components/hero"
import { AnalyzeCard } from "@/components/analyze-card"
import { RiskReport } from "@/components/risk-report"
import { AnimatedBackground } from "@/components/animated-background"
import type { RiskReportResult } from "@/lib/types"

export default function Page() {
  const [report, setReport] = useState<RiskReportResult | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const reportRef = useRef<HTMLDivElement>(null)

  const handleResult = useCallback((result: RiskReportResult) => {
    setReport(result)
    setTimeout(() => {
      reportRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    }, 200)
  }, [])

  return (
    <main className="relative min-h-screen overflow-x-hidden">
      <AnimatedBackground />
      <Navbar />

      <div className="relative z-10">
        <Hero />

        <section className="pb-8">
          <AnalyzeCard
            onResult={handleResult}
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
              <RiskReport report={report} />
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </main>
  )
}