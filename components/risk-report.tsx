"use client"

import { motion } from "framer-motion"
import { CheckCircle2, Clock } from "lucide-react"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card"
import { RiskBadge } from "@/components/risk-badge"
import { RiskTier } from "@/components/risk-tier"
import type { RiskReportResult } from "@/lib/types"

function getScoreColor(score: number): string {
  if (score >= 70) return "text-emerald-400"
  if (score >= 50) return "text-amber-400"
  return "text-red-400"
}

function getScoreRing(score: number): string {
  if (score >= 70) return "stroke-emerald-500"
  if (score >= 50) return "stroke-amber-500"
  return "stroke-red-500"
}

interface RiskReportProps {
  report: RiskReportResult
}

export function RiskReport({ report }: RiskReportProps) {
  const pct = (report.overallScore / report.maxScore) * 100
  const circumference = 2 * Math.PI * 40

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="w-full max-w-2xl mx-auto"
    >
      <Card className="overflow-hidden border-border/60 bg-card/80 backdrop-blur-xl">
        <CardHeader className="space-y-4 pb-4">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <div className="space-y-1 text-center sm:text-left">
              <h2 className="text-xl font-bold text-foreground">
                Risk Assessment Result
              </h2>
              <p className="text-sm text-muted-foreground">
                Analysis for{" "}
                <span className="font-semibold text-primary">
                  {report.projectName}
                </span>
              </p>
            </div>
            <RiskBadge level={report.overallRisk} />
          </div>

          {/* Score ring */}
          <div className="flex items-center justify-center py-2">
            <div className="relative h-28 w-28">
              <svg
                viewBox="0 0 100 100"
                className="h-full w-full -rotate-90"
                aria-hidden="true"
              >
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  className="stroke-secondary"
                  strokeWidth="6"
                />
                <motion.circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  className={getScoreRing(report.overallScore)}
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{
                    strokeDashoffset:
                      circumference - (pct / 100) * circumference,
                  }}
                  transition={{ duration: 1.2, delay: 0.3, ease: "easeOut" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <motion.span
                  className={`text-2xl font-bold font-mono ${getScoreColor(report.overallScore)}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  {report.overallScore}
                </motion.span>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  / {report.maxScore}
                </span>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {Array.isArray(report.tiers) && report.tiers.map((tier, i) => (
            <RiskTier key={tier.id} tier={tier} index={i} />
          ))}
        </CardContent>

        <CardFooter className="flex flex-col gap-2 border-t border-border/40 pt-4 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
            <span>
              Generated via Validator Consensus ({report.validatorCount}{" "}
              validators)
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>
              {new Date(report.timestamp).toLocaleString()}
            </span>
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  )
}
