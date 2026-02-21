export type RiskLevel = "LOW" | "MEDIUM" | "HIGH"

export interface RedFlag {
  id: string
  label: string
  severity: RiskLevel
}

export interface RiskTierData {
  id: string
  name: string
  score: number
  maxScore: number
  description: string
  redFlags: RedFlag[]
  icon: string
}

export interface RiskReportResult {
  projectName: string
  overallRisk: RiskLevel
  overallScore: number
  maxScore: number
  timestamp: string
  validatorCount: number
  consensusReached: boolean
  tiers: RiskTierData[]
}

export {}

declare global {
  interface Window {
    ethereum?: any
  }
}