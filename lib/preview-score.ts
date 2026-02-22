/**
 * lib/preview-score.ts
 *
 * Off-chain risk scoring for AI Preview Mode.
 *
 * MUST stay in sync with risk_review.py whenever weights or thresholds change.
 *
 * Current model:
 *   YES weights:
 *     existential: 7, structural: 3, operational: 2, contextual: 1
 *
 *   UNKNOWN weights (tier-weighted, NOT flat 1):
 *     existential: 4 (ceil 7/2)
 *     structural:  2 (ceil 3/2)
 *     operational: 1 (ceil 2/2)
 *     contextual:  1 (min 1)
 *
 *   Max score (16 questions, all YES):
 *     6×7 + 3×3 + 3×2 + 4×1 = 61
 *
 *   Thresholds:
 *     HIGH   ≥ 30
 *     MEDIUM ≥ 12
 *     LOW    < 12
 */

import type { RiskReportResult, RiskTierData, RiskLevel, RedFlag } from "@/lib/types"

// ─────────────────────────────────────────────────────────────────────────────
// Weights — sync with risk_review.py _yes_weight() and _unknown_weight()
// ─────────────────────────────────────────────────────────────────────────────

const YES_WEIGHTS: Record<string, number> = {
  existential: 7,
  structural:  3,
  operational: 2,
  contextual:  1,
}

const UNKNOWN_WEIGHTS: Record<string, number> = {
  existential: 4,  // ceil(7/2) — NOT 1
  structural:  2,  // ceil(3/2)
  operational: 1,  // ceil(2/2)
  contextual:  1,  // min 1
}

const TIER_META: Record<string, {
  name: string
  icon: string
  maxQuestions: number
}> = {
  existential: { name: "Existential Risk", icon: "shield",   maxQuestions: 6 },
  structural:  { name: "Structural Risk",  icon: "coins",    maxQuestions: 3 },
  operational: { name: "Operational Risk", icon: "users",    maxQuestions: 3 },
  contextual:  { name: "Contextual Risk",  icon: "activity", maxQuestions: 4 },
}

// Max score: 6×7 + 3×3 + 3×2 + 4×1 = 42 + 9 + 6 + 4 = 61
const MAX_SCORE       = 61
const THRESHOLD_HIGH   = 30
const THRESHOLD_MEDIUM = 12

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

  const tiers: RiskTierData[] = Object.entries(TIER_META).map(
    ([tierId, meta]) => {
      const yesLabels:     string[] = claims.yes[tierId]     ?? []
      const unknownLabels: string[] = claims.unknown[tierId] ?? []

      const yesWeight     = YES_WEIGHTS[tierId]     ?? 1
      const unknownWeight = UNKNOWN_WEIGHTS[tierId] ?? 1

      const yesScore     = yesLabels.length     * yesWeight
      const unknownScore = unknownLabels.length  * unknownWeight
      const tierScore    = yesScore + unknownScore

      totalScore += tierScore

      const tierMaxScore = meta.maxQuestions * yesWeight

      const redFlags: RedFlag[] = [
        ...yesLabels.map((label, i): RedFlag => ({
          id:       `${tierId}-yes-${i}`,
          label,
          severity: "HIGH",
        })),
        ...unknownLabels.map((label, i): RedFlag => ({
          id:       `${tierId}-unknown-${i}`,
          label,
          severity: "MEDIUM",
        })),
      ]

      return {
        id:          tierId,
        name:        meta.name,
        score:       tierScore,
        maxScore:    tierMaxScore,
        description: "AI-assessed risk signals. Not validator-confirmed.",
        redFlags,
        icon:        meta.icon,
      }
    }
  )

  const overallRisk: RiskLevel =
    totalScore >= THRESHOLD_HIGH   ? "HIGH"
    : totalScore >= THRESHOLD_MEDIUM ? "MEDIUM"
    : "LOW"

  return {
    projectName,
    overallRisk,
    overallScore:     totalScore,
    maxScore:         MAX_SCORE,
    timestamp:        new Date().toISOString(),
    validatorCount:   0,
    consensusReached: false,
    tiers,
  }
}