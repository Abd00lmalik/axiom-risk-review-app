/**
 * lib/job-store.ts
 *
 * Durable job tracking via localStorage.
 *
 * Design rationale:
 * - The GenLayer contract is the source of truth. Once a tx is FINALIZED,
 *   the result is permanently on-chain and can always be re-read.
 * - The only thing that cannot survive a page refresh is the tx hash and
 *   the proposer's claim data (needed for the write call).
 * - We store a minimal job record so that on return visits we can:
 *     1. Show the user their pending job is still running
 *     2. Poll the tx status until FINALIZED
 *     3. Call readContract and surface the result
 * - We also cache the finalized result so returning users see it instantly
 *   without an additional contract read.
 */

import type { RiskReportResult } from "@/lib/types"

const JOB_KEY = "axiom_job_v1"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type JobStatus = "pending" | "finalized" | "failed"

export interface StoredJob {
  projectName: string
  txHash: string
  submittedAt: number       // Unix ms
  status: JobStatus
  result?: RiskReportResult // populated on finalization
}

// ─────────────────────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────────────────────

function read(): StoredJob | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(JOB_KEY)
    if (!raw) return null
    return JSON.parse(raw) as StoredJob
  } catch {
    return null
  }
}

function write(job: StoredJob): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(JOB_KEY, JSON.stringify(job))
  } catch {
    // localStorage full or blocked — not fatal
  }
}

export const JobStore = {
  /**
   * Returns the current job record, or null if none exists.
   */
  get(): StoredJob | null {
    return read()
  },

  /**
   * Creates a new pending job record.
   * Call this immediately after writeContract succeeds, before waiting.
   */
  create(projectName: string, txHash: string): StoredJob {
    const job: StoredJob = {
      projectName,
      txHash,
      submittedAt: Date.now(),
      status: "pending",
    }
    write(job)
    return job
  },

  /**
   * Marks the job as finalized and caches the result.
   * Call this after readContract succeeds.
   */
  markFinalized(result: RiskReportResult): void {
    const job = read()
    if (!job) return
    write({ ...job, status: "finalized", result })
  },

  /**
   * Marks the job as failed (tx rejected, network error, etc.).
   */
  markFailed(): void {
    const job = read()
    if (!job) return
    write({ ...job, status: "failed" })
  },

  /**
   * Clears the stored job entirely.
   * Call when the user explicitly starts a new analysis.
   */
  clear(): void {
    if (typeof window === "undefined") return
    try {
      window.localStorage.removeItem(JOB_KEY)
    } catch {
      // ignore
    }
  },

  /**
   * Returns true if a pending job exists that has not yet finalized.
   */
  hasPending(): boolean {
    const job = read()
    return job !== null && job.status === "pending"
  },

  /**
   * Returns true if a finalized result is cached locally.
   */
  hasFinalized(): boolean {
    const job = read()
    return job !== null && job.status === "finalized" && job.result !== undefined
  },
}