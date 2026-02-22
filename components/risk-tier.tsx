"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Shield, Coins, Users, Activity, AlertTriangle, ChevronDown } from "lucide-react"
import { useState } from "react"
import type { RiskTierData, RiskLevel } from "@/lib/types"

const iconMap: Record<string, React.ReactNode> = {
  shield:   <Shield   className="h-4 w-4" />,
  coins:    <Coins    className="h-4 w-4" />,
  users:    <Users    className="h-4 w-4" />,
  activity: <Activity className="h-4 w-4" />,
}

const tierAccent: Record<string, string> = {
  existential: "hsl(0, 72%, 51%)",
  structural:  "hsl(38, 92%, 50%)",
  operational: "hsl(43, 96%, 56%)",
  contextual:  "hsl(197, 100%, 47%)",
}

const tierAccentFaint: Record<string, string> = {
  existential: "hsl(0 72% 51% / 0.08)",
  structural:  "hsl(38 92% 50% / 0.08)",
  operational: "hsl(43 96% 56% / 0.08)",
  contextual:  "hsl(197 100% 47% / 0.08)",
}

function getBarColor(score: number, max: number): string {
  const p = max > 0 ? score / max : 0
  if (p <= 0.2)  return "hsl(158, 64%, 42%)"
  if (p <= 0.49) return "hsl(38, 92%, 50%)"
  return "hsl(0, 72%, 51%)"
}

function flagSeverityStyle(s: RiskLevel) {
  if (s === "HIGH")   return {
    background: "hsl(0 72% 51% / 0.1)",
    border: "1px solid hsl(0 72% 51% / 0.3)",
    color: "hsl(0 84% 70%)",
  }
  if (s === "MEDIUM") return {
    background: "hsl(38 92% 50% / 0.1)",
    border: "1px solid hsl(38 92% 50% / 0.3)",
    color: "hsl(38 95% 65%)",
  }
  return {
    background: "hsl(158 64% 42% / 0.1)",
    border: "1px solid hsl(158 64% 42% / 0.3)",
    color: "hsl(158 70% 55%)",
  }
}

interface RiskTierProps {
  tier: RiskTierData
  index: number
}

export function RiskTier({ tier, index }: RiskTierProps) {
  const [open, setOpen] = useState(false)
  const accent      = tierAccent[tier.id]      ?? "hsl(197, 100%, 47%)"
  const accentFaint = tierAccentFaint[tier.id] ?? "hsl(197 100% 47% / 0.08)"
  const barColor    = getBarColor(tier.score, tier.maxScore)
  const barPct      = tier.maxScore > 0 ? Math.min((tier.score / tier.maxScore) * 100, 100) : 0
  const hasFlags    = tier.redFlags.length > 0

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, delay: index * 0.08, ease: "easeOut" }}
    >
      <div
        className="rounded-xl overflow-hidden transition-all duration-200 cursor-pointer"
        style={{
          background: open ? accentFaint : "hsl(220 25% 8% / 0.6)",
          border: `1px solid ${open ? accent + "33" : "hsl(220 25% 13%)"}`,
          borderLeft: `3px solid ${accent}`,
        }}
        onClick={() => setOpen(!open)}
      >
        {/* Row header */}
        <div className="flex items-center gap-3 px-4 py-3">
          {/* Icon */}
          <div className="shrink-0" style={{ color: accent }}>
            {iconMap[tier.icon] ?? <Shield className="h-4 w-4" />}
          </div>

          {/* Name */}
          <span
            className="text-sm font-semibold text-foreground flex-1 min-w-0"
            style={{ fontFamily: "'Syne', system-ui, sans-serif" }}
          >
            {tier.name}
          </span>

          {/* Progress bar + score */}
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <div className="w-20 h-1 rounded-full overflow-hidden" style={{ background: "hsl(220 25% 13%)" }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: barColor, boxShadow: `0 0 6px ${barColor}80` }}
                initial={{ width: 0 }}
                animate={{ width: `${barPct}%` }}
                transition={{ duration: 0.9, delay: index * 0.08 + 0.3 }}
              />
            </div>
            <span className="text-[11px] font-mono text-muted-foreground w-12 text-right">
              {tier.score}/{tier.maxScore}
            </span>
          </div>

          {/* Flag count badge */}
          {hasFlags && (
            <span
              className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold"
              style={{
                background: `${accent}18`,
                border: `1px solid ${accent}40`,
                color: accent,
              }}
            >
              {tier.redFlags.length}
            </span>
          )}

          {/* Chevron */}
          <motion.div
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="shrink-0 text-muted-foreground/40"
          >
            <ChevronDown className="h-4 w-4" />
          </motion.div>
        </div>

        {/* Expanded content */}
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 space-y-3">
                {/* Mobile score row */}
                <div className="sm:hidden flex items-center gap-2">
                  <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "hsl(220 25% 13%)" }}>
                    <div className="h-full rounded-full" style={{ background: barColor, width: `${barPct}%` }} />
                  </div>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    {tier.score}/{tier.maxScore}
                  </span>
                </div>

                <p className="text-[11px] font-mono text-muted-foreground leading-relaxed">
                  {tier.description}
                </p>

                {hasFlags ? (
                  <div className="space-y-2">
                    <p className="text-[9px] font-mono tracking-widest uppercase text-muted-foreground/50">
                      Risk Signals
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {tier.redFlags.map((flag) => (
                        <span
                          key={flag.id}
                          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-mono"
                          style={flagSeverityStyle(flag.severity)}
                          title={flag.severity === "MEDIUM" ? "Unresolved — not validator-confirmed" : "Validator confirmed"}
                        >
                          <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
                          {flag.label}
                          {flag.severity === "MEDIUM" && (
                            <span className="opacity-50 text-[9px]">?</span>
                          )}
                        </span>
                      ))}
                    </div>
                    {tier.redFlags.some(f => f.severity === "MEDIUM") && (
                      <p className="text-[9px] font-mono text-muted-foreground/35">
                        Flags marked ? are unresolved signals — lighter weighted
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-[11px] font-mono" style={{ color: "hsl(158 64% 42% / 0.7)" }}>
                    ✓ No risk signals detected in this tier
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}