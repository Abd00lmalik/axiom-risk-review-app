"use client"

import { motion } from "framer-motion"
import { Shield, Coins, Users, Activity, AlertTriangle } from "lucide-react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import type { RiskTierData, RiskLevel } from "@/lib/types"

const iconMap: Record<string, React.ReactNode> = {
  shield:   <Shield   className="h-5 w-5" />,
  coins:    <Coins    className="h-5 w-5" />,
  users:    <Users    className="h-5 w-5" />,
  activity: <Activity className="h-5 w-5" />,
}

// ── Proportional color functions ──────────────────────────────────────────────
// Use score/maxScore ratio so these work correctly regardless of tier weights.
// Thresholds align with overall risk thresholds (HIGH ~49%, MEDIUM ~20%).

function getBarColor(score: number, maxScore: number): string {
  const pct = maxScore > 0 ? score / maxScore : 0
  if (pct <= 0.2)  return "bg-emerald-500"
  if (pct <= 0.51) return "bg-amber-500"
  return "bg-red-500"
}

function getBarTrack(score: number, maxScore: number): string {
  const pct = maxScore > 0 ? score / maxScore : 0
  if (pct <= 0.2)  return "bg-emerald-500/10"
  if (pct <= 0.51) return "bg-amber-500/10"
  return "bg-red-500/10"
}

function severityClass(s: RiskLevel): string {
  if (s === "HIGH")   return "text-red-400 bg-red-500/10 border-red-500/20"
  if (s === "MEDIUM") return "text-amber-400 bg-amber-500/10 border-amber-500/20"
  return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
}

interface RiskTierProps {
  tier: RiskTierData
  index: number
}

export function RiskTier({ tier, index }: RiskTierProps) {
  const barPct = tier.maxScore > 0
    ? Math.min((tier.score / tier.maxScore) * 100, 100)
    : 0

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1, ease: "easeOut" }}
    >
      <Accordion type="single" collapsible>
        <AccordionItem
          value={tier.id}
          className="rounded-xl border border-border/60 bg-secondary/30 px-4 hover:bg-secondary/50 transition-colors"
        >
          <AccordionTrigger className="hover:no-underline py-4">
            <div className="flex flex-1 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
                {iconMap[tier.icon] ?? <Shield className="h-5 w-5" />}
              </div>

              <div className="flex flex-1 flex-col items-start gap-1 text-left sm:flex-row sm:items-center sm:gap-4">
                <span className="text-sm font-semibold text-foreground">
                  {tier.name}
                </span>

                <div className="flex items-center gap-2">
                  <div className={`h-1.5 w-16 rounded-full overflow-hidden ${getBarTrack(tier.score, tier.maxScore)}`}>
                    <motion.div
                      className={`h-full rounded-full ${getBarColor(tier.score, tier.maxScore)}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${barPct}%` }}
                      transition={{ duration: 0.8, delay: index * 0.1 + 0.3 }}
                    />
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">
                    {tier.score}/{tier.maxScore}
                  </span>
                </div>

                {/* Flag count badge */}
                {tier.redFlags.length > 0 && (
                  <span className="text-xs font-medium text-red-400 bg-red-500/10 border border-red-500/20 rounded-full px-2 py-0.5">
                    {tier.redFlags.length} flag{tier.redFlags.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>
          </AccordionTrigger>

          <AccordionContent>
            <div className="space-y-4 pb-2">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {tier.description}
              </p>

              {Array.isArray(tier.redFlags) && tier.redFlags.length > 0 ? (
                <div className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Risk Signals
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {tier.redFlags.map((flag) => (
                      <span
                        key={flag.id}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${severityClass(flag.severity)}`}
                        title={flag.severity === "MEDIUM" ? "Unresolved signal — not validator-confirmed" : "Confirmed by validators"}
                      >
                        <AlertTriangle className="h-3 w-3 shrink-0" />
                        {flag.label}
                        {flag.severity === "MEDIUM" && (
                          <span className="opacity-60 text-[10px]">?</span>
                        )}
                      </span>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground/50">
                    Orange flags (?) indicate unresolved signals. Red flags are confirmed.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-emerald-400/80">
                  No risk signals detected in this tier.
                </p>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </motion.div>
  )
}