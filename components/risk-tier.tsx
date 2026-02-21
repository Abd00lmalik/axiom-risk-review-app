"use client"

import { motion } from "framer-motion"
import { Shield, Coins, Users, Activity } from "lucide-react"
import { AlertTriangle } from "lucide-react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import type { RiskTierData, RiskLevel } from "@/lib/types"

const iconMap: Record<string, React.ReactNode> = {
  shield: <Shield className="h-5 w-5" />,
  coins: <Coins className="h-5 w-5" />,
  users: <Users className="h-5 w-5" />,
  activity: <Activity className="h-5 w-5" />,
}

function getScoreColor(score: number): string {
  if (score >= 70) return "bg-emerald-500"
  if (score >= 50) return "bg-amber-500"
  return "bg-red-500"
}

function getScoreTrack(score: number): string {
  if (score >= 70) return "bg-emerald-500/10"
  if (score >= 50) return "bg-amber-500/10"
  return "bg-red-500/10"
}

interface RiskTierProps {
  tier: RiskTierData
  index: number
}

export function RiskTier({ tier, index }: RiskTierProps) {
  const severityLabel = (s: RiskLevel) => {
    if (s === "HIGH") return "text-red-400 bg-red-500/10 border-red-500/20"
    if (s === "MEDIUM") return "text-amber-400 bg-amber-500/10 border-amber-500/20"
    return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
  }

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
                {iconMap[tier.icon] || <Shield className="h-5 w-5" />}
              </div>
              <div className="flex flex-1 flex-col items-start gap-1 text-left sm:flex-row sm:items-center sm:gap-4">
                <span className="text-sm font-semibold text-foreground">
                  {tier.name}
                </span>
                <div className="flex items-center gap-2">
                  <div
                    className={`h-1.5 w-16 rounded-full overflow-hidden ${getScoreTrack(tier.score)}`}
                  >
                    <motion.div
                      className={`h-full rounded-full ${getScoreColor(tier.score)}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${(tier.score / tier.maxScore) * 100}%` }}
                      transition={{ duration: 0.8, delay: index * 0.1 + 0.3 }}
                    />
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">
                    {tier.score}/{tier.maxScore}
                  </span>
                </div>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pb-2">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {tier.description}
              </p>
              {Array.isArray(tier.redFlags) &&tier.redFlags.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Red Flags
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {tier.redFlags.map((flag) => (
                      <span
                        key={flag.id}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${severityLabel(flag.severity)}`}
                      >
                        <AlertTriangle className="h-3 w-3 shrink-0" />
                        {flag.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </motion.div>
  )
}
