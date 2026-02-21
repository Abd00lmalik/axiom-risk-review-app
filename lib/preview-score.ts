/**
 * lib/preview-score.ts
 *
 * Off-chain risk scoring for AI Preview Mode.
 *
 * Mirrors the GenLayer contract's scoring logic exactly, including:
 * - Tier 1 weight: 7 (updated from 5)
 * - UNKNOWN signals: 1 point each regardless of tier
 * - Same thresholds: HIGH ≥ 25, MEDIUM ≥ 10
 * - Same max score: 49
 *
 * This must stay in sync with risk_review.py whenever weights change.
 *
 * Output: RiskReportResult — same shape as the contract read,
 * so it renders through the existing RiskReport component unchanged.
 */

import type { RiskReportResult, RiskTierData, RiskLevel, RedFlag } from "@/lib/types"

// ─────────────────────────────────────────────────────────────────────────────
// Weights — must match risk_review.py _tier_weight()
// ─────────────────────────────────────────────────────────────────────────────

const TIER_WEIGHTS: Record<string, number> = {
  existential: 7,
  structural:  3,
  operational: 2,
  contextual:  1,
}

const TIER_META: Record<string, { name: string; icon: string; maxQuestions: number }> = {
  existential: { name: "Existential Risk", icon: "shield",   maxQuestions: 5 },
  structural:  { name: "Structural Risk",  icon: "coins",    maxQuestions: 2 },
  operational: { name: "Operational Risk", icon: "users",    maxQuestions: 2 },
  contextual:  { name: "Contextual Risk",  icon: "activity", maxQuestions: 4 },
}

// Max possible score: 5×7 + 2×3 + 2×2 + 4×1 = 35 + 6 + 4 + 4 = 49
const MAX_SCORE = 49

// Thresholds proportional to old thresholds (HIGH ~51%, MEDIUM ~20% of max)
const THRESHOLD_HIGH   = 25
const THRESHOLD_MEDIUM = 10

// ─────────────────────────────────────────────────────────────────────────────
// Compute
// ─────────────────────────────────────────────────────────────────────────────

export interface PreviewClaims {
  yes:     Record<string, string[]>
  unknown: Record<string, string[]>
}

export function computePreviewScore(
  projectName: string,
  claims: PreviewClaims
): RiskReportResult {
  let totalScore = 0

  const tiers: RiskTierData[] = Object.entries(TIER_META).map(([tierId, meta]) => {
    const yesLabels:     string[] = claims.yes[tierId]     ?? []
    const unknownLabels: string[] = claims.unknown[tierId] ?? []

    const weight = TIER_WEIGHTS[tierId] ?? 1

    // YES claims — full tier weight
    const yesScore = yesLabels.length * weight

    // UNKNOWN claims — 1 point each (same as contract)
    const unknownScore = unknownLabels.length * 1

    const tierScore = yesScore + unknownScore
    totalScore += tierScore

    // Max per tier: all questions answered YES
    const tierMax = meta.maxQuestions * weight

    const redFlags: RedFlag[] = [
      ...yesLabels.map((label, i): RedFlag => ({
        id:       `${tierId}-yes-${i}`,
        label,
        severity: "HIGH",
      })),
      ...unknownLabels.map((label, i): RedFlag => ({
        id:       `${tierId}-unknown-${i}`,
        label,
        severity: "MEDIUM", // UNKNOWN = unresolved, lighter severity
      })),
    ]

    return {
      id:          tierId,
      name:        meta.name,
      score:       tierScore,
      maxScore:    tierMax,
      description: "AI-assessed risk signals. Not validator-confirmed.",
      redFlags,
      icon:        meta.icon,
    }
  })

  const overallRisk: RiskLevel =
    totalScore >= THRESHOLD_HIGH   ? "HIGH"
    : totalScore >= THRESHOLD_MEDIUM ? "MEDIUM"
    : "LOW"

  return {
    projectName,
    overallRisk,
    overallScore: totalScore,
    maxScore:     MAX_SCORE,
    timestamp:    new Date().toISOString(),
    validatorCount:   0,
    consensusReached: false, // always false — no on-chain validation
    tiers,
  }
}