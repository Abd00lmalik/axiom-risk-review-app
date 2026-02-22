"use client"

import { motion } from "framer-motion"
import { CheckCircle2, AlertTriangle, ShieldCheck, ArrowRight, Terminal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { RiskBadge } from "@/components/risk-badge"
import { RiskTier } from "@/components/risk-tier"
import type { RiskReportResult } from "@/lib/types"

function getRingColor(score: number, max: number): string {
  const p = max > 0 ? score / max : 0
  if (p <= 0.2)  return "hsl(158, 64%, 42%)"
  if (p <= 0.49) return "hsl(38, 92%, 50%)"
  return "hsl(0, 72%, 51%)"
}

function getScoreClass(score: number, max: number): string {
  const p = max > 0 ? score / max : 0
  if (p <= 0.2)  return "text-emerald-400"
  if (p <= 0.49) return "text-amber-400"
  return "text-red-400"
}

interface RiskReportProps {
  report: RiskReportResult
  mode: "preview" | "verified"
  onRequestVerified?: () => void
}

export function RiskReport({ report, mode, onRequestVerified }: RiskReportProps) {
  const isPreview     = mode === "preview"
  const pct           = report.maxScore > 0 ? (report.overallScore / report.maxScore) * 100 : 0
  const circumference = 2 * Math.PI * 40
  const offset        = circumference - (pct / 100) * circumference
  const ringColor     = getRingColor(report.overallScore, report.maxScore)

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="w-full max-w-2xl mx-auto"
    >
      {/* Preview banner */}
      {isPreview && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-4 flex items-start gap-3 rounded-xl px-4 py-3"
          style={{
            background: "hsl(38 92% 50% / 0.07)",
            border: "1px solid hsl(38 92% 50% / 0.25)",
          }}
        >
          <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-amber-300 mb-0.5">⚠ Unverified AI Output</p>
            <p className="text-[11px] font-mono text-amber-300/55 leading-relaxed">
              AI-generated from public sources only. Not validator-confirmed. Not stored on-chain.
            </p>
          </div>
        </motion.div>
      )}

      {/* Card */}
      <div
        className="relative overflow-hidden rounded-2xl"
        style={{
          background: "linear-gradient(135deg, hsl(222 28% 6% / 0.96), hsl(220 30% 7% / 0.96))",
          border: isPreview ? "1px solid hsl(38 92% 50% / 0.2)" : "1px solid hsl(197 100% 47% / 0.2)",
          boxShadow: isPreview
            ? "0 0 40px hsl(38 92% 50% / 0.06), inset 0 1px 0 hsl(38 92% 50% / 0.07)"
            : "0 0 40px hsl(197 100% 47% / 0.07), inset 0 1px 0 hsl(197 100% 47% / 0.07)",
          backdropFilter: "blur(24px)",
        }}
      >
        {/* Top line accent */}
        <div className="absolute top-0 left-0 right-0 h-px" style={{
          background: isPreview
            ? "linear-gradient(90deg, transparent, hsl(38 92% 50% / 0.5), transparent)"
            : "linear-gradient(90deg, transparent, hsl(197 100% 47% / 0.5), transparent)",
        }} />

        {/* Preview badge */}
        {isPreview && (
          <div className="absolute top-4 right-4 z-10">
            <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold tracking-widest uppercase"
              style={{
                background: "hsl(38 92% 50% / 0.1)",
                border: "1px solid hsl(38 92% 50% / 0.3)",
                color: "hsl(38 95% 65%)",
              }}>
              AI Preview
            </span>
          </div>
        )}

        {/* Header */}
        <div className="p-6 pb-4">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-5">
              {/* Radar ring */}
              <div className="relative h-24 w-24 shrink-0">
                <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(220 25% 12%)" strokeWidth="7" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(220 25% 16%)" strokeWidth="1" strokeDasharray="4 4" />
                  <motion.circle
                    cx="50" cy="50" r="40"
                    fill="none"
                    stroke={ringColor}
                    strokeWidth="7"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: offset }}
                    transition={{ duration: 1.5, delay: 0.3, ease: [0.34, 1.2, 0.64, 1] }}
                    style={{ filter: `drop-shadow(0 0 8px ${ringColor}80)` }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <motion.span
                    className={`text-2xl font-bold font-mono ${getScoreClass(report.overallScore, report.maxScore)}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                  >
                    {report.overallScore}
                  </motion.span>
                  <span className="text-[9px] font-mono text-muted-foreground tracking-wider">
                    /{report.maxScore}
                  </span>
                </div>
              </div>

              {/* Meta */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {isPreview
                    ? <AlertTriangle className="h-4 w-4 text-amber-400" />
                    : <ShieldCheck className="h-4 w-4 text-cyan-400" />
                  }
                  <h2 className="text-lg font-bold text-foreground"
                    style={{ fontFamily: "'Syne', system-ui, sans-serif" }}>
                    {isPreview ? "AI Risk Preview" : "Verified Assessment"}
                  </h2>
                </div>
                <p className="text-[11px] font-mono text-muted-foreground">
                  <span className="text-cyan-500/50 mr-2">SUBJECT</span>
                  <span className="text-foreground/80">{report.projectName}</span>
                </p>
                <p className="text-[10px] font-mono text-muted-foreground/40">
                  {new Date(report.timestamp).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="sm:pt-1">
              <RiskBadge level={report.overallRisk} />
            </div>
          </div>
        </div>

        <div className="mx-6 h-px bg-border/60" />

        {/* Tiers */}
        <div className="p-4 space-y-2">
          {Array.isArray(report.tiers) && report.tiers.map((tier, i) => (
            <RiskTier key={tier.id} tier={tier} index={i} />
          ))}
        </div>

        <div className="mx-6 h-px bg-border/60" />

        {/* Footer */}
        <div className="px-6 py-4 flex flex-col gap-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center">
            <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground">
              {isPreview ? (
                <><AlertTriangle className="h-3.5 w-3.5 text-amber-500/60" /><span>AI-only · Not validator-confirmed</span></>
              ) : (
                <><CheckCircle2 className="h-3.5 w-3.5 text-cyan-400/60" />
                <span>Validator consensus · {report.validatorCount > 0 ? `${report.validatorCount} validators` : "On-chain"}</span></>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground/40">
              <Terminal className="h-3 w-3" />
              <span>GenLayer ISC</span>
            </div>
          </div>

          {isPreview && onRequestVerified && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="rounded-xl p-4"
              style={{
                background: "hsl(197 100% 47% / 0.05)",
                border: "1px solid hsl(197 100% 47% / 0.15)",
              }}
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold text-foreground mb-0.5"
                    style={{ fontFamily: "'Syne', system-ui, sans-serif" }}>
                    Get validator-confirmed results
                  </p>
                  <p className="text-[11px] font-mono text-muted-foreground">
                    Submit to GenLayer consensus for an on-chain verified report.
                  </p>
                </div>
                <Button size="sm" className="shrink-0 h-8 text-xs font-mono" onClick={onRequestVerified}
                  style={{ background: "hsl(197 100% 47%)", color: "hsl(220 30% 4%)" }}>
                  Verify<ArrowRight className="ml-1.5 h-3 w-3" />
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  )
}