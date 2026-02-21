/**
 * lib/genlayer.ts
 *
 * GenLayer JS SDK integration.
 *
 * Key changes from previous version:
 * - submitClaimsAndFetchReport now saves txHash to JobStore immediately
 *   after writeContract, before waiting. This makes the job recoverable
 *   across page refreshes.
 * - Real transaction status is polled via client.getTransactionByHash()
 *   every 4 seconds and forwarded to the UI via onStatusUpdate callback.
 * - resumeFromJob() allows the card to re-attach to an in-progress tx
 *   on page load, without re-submitting.
 */

import { createClient } from "genlayer-js"
import { studionet } from "genlayer-js/chains"
import { TransactionStatus } from "genlayer-js/types"
import type { Hash } from "genlayer-js/types"
import { JobStore } from "@/lib/job-store"
import type { RiskReportResult, RiskTierData, RiskLevel } from "@/lib/types"

/**
 * Cast a plain string to genlayer-js's branded Hash type.
 * Hash is nominally typed as { length: 66 } — we must go via unknown.
 * Used when reading txHash back from localStorage (stored as string).
 */
function toHash(s: string): Hash {
  return s as unknown as Hash
}

export const CONTRACT_ADDRESS =
  "0xF51d31128aA793cC86f10f02B266be59f35a29B4" as `0x${string}`

// ─────────────────────────────────────────────────────────────────────────────
// Public status labels (maps to GenLayer TransactionStatus enum values)
// ─────────────────────────────────────────────────────────────────────────────

export type TxPhase =
  | "wallet"
  | "submitting"
  | "pending"
  | "proposing"
  | "committing"
  | "revealing"
  | "accepted"
  | "finalizing"
  | "reading"
  | "complete"
  | "failed"

export const TX_PHASE_LABEL: Record<TxPhase, string> = {
  wallet:     "Awaiting wallet signature…",
  submitting: "Submitting to network…",
  pending:    "Transaction pending…",
  proposing:  "Validators proposing…",
  committing: "Validators committing…",
  revealing:  "Validators revealing…",
  accepted:   "Consensus accepted…",
  finalizing: "Finalizing consensus…",
  reading:    "Reading verified report…",
  complete:   "Complete",
  failed:     "Transaction failed",
}

export const TX_PHASE_PROGRESS: Record<TxPhase, number> = {
  wallet:     30,
  submitting: 40,
  pending:    48,
  proposing:  58,
  committing: 68,
  revealing:  78,
  accepted:   86,
  finalizing: 90,
  reading:    95,
  complete:   100,
  failed:     0,
}

/**
 * Map GenLayer TransactionStatus enum values → TxPhase.
 * TransactionStatus values: PENDING, PROPOSING, COMMITTING, REVEALING,
 * ACCEPTED, FINALIZED (strings from genlayer-js/types)
 */
function mapTransactionStatus(status: string): TxPhase {
  switch (status?.toUpperCase()) {
    case "PENDING":    return "pending"
    case "PROPOSING":  return "proposing"
    case "COMMITTING": return "committing"
    case "REVEALING":  return "revealing"
    case "ACCEPTED":   return "accepted"
    case "FINALIZED":  return "finalizing"
    default:           return "pending"
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// UI report builder
// ─────────────────────────────────────────────────────────────────────────────

interface ContractFlag {
  label: string
  source: "CONFIRMED" | "UNCONFIRMED"
}

type ContractFlagMap = Record<string, ContractFlag[]>

interface ContractReport {
  project_name: string
  overall_risk: "LOW" | "MEDIUM" | "HIGH"
  total_score: number
  max_score: number
  flags: ContractFlagMap
}

const TIER_META: Record<string, { name: string; icon: string }> = {
  existential: { name: "Existential Risk", icon: "shield" },
  structural:  { name: "Structural Risk",  icon: "coins" },
  operational: { name: "Operational Risk", icon: "users" },
  contextual:  { name: "Contextual Risk",  icon: "activity" },
}

function buildUiReport(projectName: string, raw: unknown): RiskReportResult {
  const empty: RiskReportResult = {
    projectName,
    overallRisk: "LOW",
    overallScore: 0,
    maxScore: 0,
    timestamp: new Date().toISOString(),
    validatorCount: 0,
    consensusReached: false,
    tiers: [],
  }

  if (!raw || typeof raw !== "object") return empty

  const report = raw as ContractReport
  const flagsByTier: ContractFlagMap =
    report.flags && typeof report.flags === "object" ? report.flags : {}

  const tiers: RiskTierData[] = Object.entries(TIER_META).map(
    ([tierId, meta]) => {
      const flags: ContractFlag[] = flagsByTier[tierId] ?? []
      return {
        id: tierId,
        name: meta.name,
        score: flags.length,
        maxScore: 13,
        description: "Validator-confirmed risk signals.",
        redFlags: flags.map((flag, i) => {
          const label = typeof flag === "string" ? flag : flag.label
          const source = typeof flag === "object" ? flag.source : "CONFIRMED"
          return {
            id: `${tierId}-${i}`,
            label,
            severity: (source === "UNCONFIRMED" ? "MEDIUM" : "HIGH") as RiskLevel,
          }
        }),
        icon: meta.icon,
      }
    }
  )

  return {
    projectName: report.project_name ?? projectName,
    overallRisk: (report.overall_risk as RiskLevel) ?? "LOW",
    overallScore: Number(report.total_score ?? 0),
    maxScore: Number(report.max_score ?? 0),
    timestamp: new Date().toISOString(),
    validatorCount: 0,
    consensusReached: true,
    tiers,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MetaMask / client bootstrap (shared between submit and resume paths)
// ─────────────────────────────────────────────────────────────────────────────

async function buildClient() {
  const ethereum = (window as unknown as Record<string, unknown>).ethereum
  if (!ethereum) {
    throw new Error(
      "MetaMask not detected. Please install MetaMask and connect to GenLayer Studionet."
    )
  }
  const accounts = await (
    ethereum as { request: (args: { method: string }) => Promise<string[]> }
  ).request({ method: "eth_requestAccounts" })

  if (!accounts || accounts.length === 0) {
    throw new Error("No accounts returned from MetaMask.")
  }

  const client = createClient({ chain: studionet, account: accounts[0] as `0x${string}` })
  await client.initializeConsensusSmartContract()
  return client
}

// ─────────────────────────────────────────────────────────────────────────────
// Status polling
//
// GenLayer SDK exposes getTransactionByHash (or equivalent) to read the
// current transaction status without waiting for finalization.
// We poll every 4s and forward the real status to the UI callback.
//
// NOTE: If your version of genlayer-js uses a different method name,
// update the call inside pollStatus accordingly.
// ─────────────────────────────────────────────────────────────────────────────

function startStatusPolling(
  client: ReturnType<typeof createClient>,
  txHash: Hash,
  onPhase: (phase: TxPhase) => void
): () => void {
  const interval = setInterval(async () => {
    try {
      // getTransactionByHash returns { status: TransactionStatus, ... }
      const tx = await (client as unknown as {
        getTransactionByHash: (args: { hash: string }) => Promise<{ status: string }>
      }).getTransactionByHash({ hash: txHash })

      if (tx?.status) {
        onPhase(mapTransactionStatus(tx.status))
      }
    } catch {
      // Polling failure is non-fatal — status display degrades gracefully
    }
  }, 4000)

  return () => clearInterval(interval)
}

// ─────────────────────────────────────────────────────────────────────────────
// Read contract (shared between submit and resume paths)
// ─────────────────────────────────────────────────────────────────────────────

async function readReport(
  client: ReturnType<typeof createClient>,
  projectName: string
): Promise<RiskReportResult> {
  const raw = await client.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "get_latest_report",
    args: [projectName],
    jsonSafeReturn: true,
  })
  return buildUiReport(projectName, raw)
}

// ─────────────────────────────────────────────────────────────────────────────
// Submit new claims
// ─────────────────────────────────────────────────────────────────────────────

export async function submitClaimsAndFetchReport(
  projectName: string,
  proposerResult: {
    projectName: string
    claims: {
      yes: Record<string, string[]>
      unknown: Record<string, string[]>
    }
  },
  onPhase: (phase: TxPhase) => void
): Promise<RiskReportResult> {
  const client = await buildClient()

  // Wallet prompt just fired — update UI
  onPhase("submitting")

  const yesJson = JSON.stringify(proposerResult.claims.yes ?? {})
  const unknownJson = JSON.stringify(proposerResult.claims.unknown ?? {})

  const txHash = await client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: "submit_claims",
    args: [projectName, yesJson, unknownJson],
    value: BigInt(0),
  })

  // ── Persist the job immediately — before waiting ──────────────────────────
  // If the user closes the tab now, they can resume on return.
  JobStore.create(projectName, txHash)
  onPhase("pending")

  // ── Poll real status in parallel ──────────────────────────────────────────
  const stopPolling = startStatusPolling(client, txHash, onPhase)

  try {
    await client.waitForTransactionReceipt({
      hash: txHash,
      status: TransactionStatus.FINALIZED,
      retries: 200,
      interval: 5000,
    })
  } finally {
    stopPolling()
  }

  onPhase("reading")
  const result = await readReport(client, projectName)

  JobStore.markFinalized(result)
  onPhase("complete")

  return result
}

// ─────────────────────────────────────────────────────────────────────────────
// Resume a pending job (called on page load when a pending job is found)
//
// This path does NOT re-submit anything. It re-attaches to the existing tx
// hash and waits for finalization, then reads the result.
// ─────────────────────────────────────────────────────────────────────────────

export async function resumePendingJob(
  onPhase: (phase: TxPhase) => void
): Promise<{ projectName: string; result: RiskReportResult } | null> {
  const job = JobStore.get()
  if (!job || job.status !== "pending") return null

  const { projectName, txHash } = job

  let client: ReturnType<typeof createClient>
  try {
    client = await buildClient()
  } catch {
    // MetaMask not available — can't resume interactively
    // Return null so the card shows a "reconnect wallet" prompt
    return null
  }

  onPhase("pending")

  const stopPolling = startStatusPolling(client, toHash(txHash), onPhase)

  try {
    await client.waitForTransactionReceipt({
      hash: toHash(txHash),
      status: TransactionStatus.FINALIZED,
      retries: 200,
      interval: 5000,
    })
  } finally {
    stopPolling()
  }

  onPhase("reading")
  const result = await readReport(client, projectName)

  JobStore.markFinalized(result)
  onPhase("complete")

  return { projectName, result }
}