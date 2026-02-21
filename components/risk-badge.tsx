"use client"

import { motion } from "framer-motion"
import type { RiskLevel } from "@/lib/types"

const riskConfig: Record<
  RiskLevel,
  { bg: string; text: string; border: string; glow: string }
> = {
  LOW: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
    glow: "shadow-[0_0_12px_rgba(16,185,129,0.2)]",
  },
  MEDIUM: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/30",
    glow: "shadow-[0_0_12px_rgba(245,158,11,0.2)]",
  },
  HIGH: {
    bg: "bg-red-500/10",
    text: "text-red-400",
    border: "border-red-500/30",
    glow: "shadow-[0_0_12px_rgba(239,68,68,0.2)]",
  },
}

interface RiskBadgeProps {
  level: RiskLevel
  animated?: boolean
}

export function RiskBadge({ level, animated = true }: RiskBadgeProps) {
  const config = riskConfig[level]

  const badge = (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${config.bg} ${config.text} ${config.border} ${config.glow}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${level === "LOW" ? "bg-emerald-400" : level === "MEDIUM" ? "bg-amber-400" : "bg-red-400"}`}
      />
      {level} Risk
    </span>
  )

  if (!animated) return badge

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 15 }}
    >
      {badge}
    </motion.div>
  )
}
