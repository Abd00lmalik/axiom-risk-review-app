"use client"

import { useState, useCallback, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Zap, Loader2, RefreshCw, AlertCircle, Wallet } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  submitClaimsAndFetchReport,
  resumePendingJob,
  TX_PHASE_LABEL,
  TX_PHASE_PROGRESS,
  type TxPhase,
} from "@/lib/genlayer"
import { JobStore } from "@/lib/job-store"
import { useWallet } from "@/lib/use-wallet"
import type { RiskReportResult } from "@/lib/types"

type CardState = "idle" | "research" | "active" | "complete" | "resuming"

export function AnalyzeCard({
  onResult,
  isAnalyzing,
  setIsAnalyzing,
}: {
  onResult: (result: RiskReportResult) => void
  isAnalyzing: boolean
  setIsAnalyzing: (v: boolean) => void
}) {
  const wallet = useWallet()

  const [projectName, setProjectName] = useState("")
  const [cardState, setCardState] = useState<CardState>("idle")
  const [txPhase, setTxPhase] = useState<TxPhase>("wallet")
  const [error, setError] = useState<string | null>(null)

  // ── Hydration-safe resume banner ──────────────────────────────────────────
  // CRITICAL: never read localStorage during render — SSR has no localStorage.
  // Both states initialise false/empty so server and client match on first paint.
  // useEffect (client-only) sets the real values after hydration completes.
  const [showResumeBanner, setShowResumeBanner] = useState(false)
  const [resumeProjectName, setResumeProjectName] = useState("")

  useEffect(() => {
    const job = JobStore.get()
    if (!job) return

    if (job.status === "finalized" && job.result) {
      onResult(job.result)
      return
    }

    if (job.status === "pending") {
      setResumeProjectName(job.projectName)
      setShowResumeBanner(true)
    }
  }, [onResult])

  // ── Derived progress & labels ─────────────────────────────────────────────
  const progress =
    cardState === "research"   ? 18
    : cardState === "active"   ? TX_PHASE_PROGRESS[txPhase]
    : cardState === "resuming" ? TX_PHASE_PROGRESS[txPhase]
    : cardState === "complete" ? 100
    : 0

  const statusLabel =
    cardState === "research" ? "Researching via Heurist Mesh…"
    : cardState === "active" || cardState === "resuming" ? TX_PHASE_LABEL[txPhase]
    : cardState === "complete" ? "Complete"
    : ""

  // ── Resume handler ────────────────────────────────────────────────────────
  const handleResume = useCallback(async () => {
    const job = JobStore.get()
    if (!job || job.status !== "pending") return

    setError(null)
    setIsAnalyzing(true)
    setCardState("resuming")
    setTxPhase("pending")
    setShowResumeBanner(false)

    try {
      if (wallet.status !== "connected") await wallet.connect()

      const outcome = await resumePendingJob((phase) => setTxPhase(phase))
      if (!outcome) throw new Error("Could not reconnect. Ensure MetaMask is on GenLayer Studionet.")

      setCardState("complete")
      setTimeout(() => {
        setIsAnalyzing(false)
        setCardState("idle")
        onResult(outcome.result)
      }, 800)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Resume failed."
      setError(message)
      setIsAnalyzing(false)
      setCardState("idle")
      JobStore.markFailed()
    }
  }, [wallet, onResult, setIsAnalyzing])

  // ── Analyze handler ───────────────────────────────────────────────────────
  const handleAnalyze = useCallback(async () => {
    if (!projectName.trim() || isAnalyzing) return

    // Wallet gate — connect and switch network before anything else
    if (wallet.status !== "connected") {
      try {
        await wallet.connect()
      } catch {
        setError("Please connect your wallet and switch to GenLayer Studio Network.")
        return
      }
      // After connect() resolves, re-check — user may have rejected network switch
      // The next click will retry. Don't proceed if still not connected.
      return
    }

    JobStore.clear()
    setError(null)
    setIsAnalyzing(true)
    setCardState("research")
    setShowResumeBanner(false)

    try {
      // Step 1 — Heurist Mesh
      const apiRes = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectName: projectName.trim() }),
      })

      if (!apiRes.ok) {
        const body = await apiRes.json().catch(() => ({}))
        throw new Error((body as { message?: string }).message ?? "Heurist proposer failed")
      }

      const proposerResult = await apiRes.json()

      // Step 2 — GenLayer write → poll → read
      setCardState("active")
      setTxPhase("wallet")

      const finalReport = await submitClaimsAndFetchReport(
        projectName.trim(),
        proposerResult,
        (phase) => setTxPhase(phase)
      )

      setCardState("complete")
      setTimeout(() => {
        setIsAnalyzing(false)
        setCardState("idle")
        onResult(finalReport)
      }, 800)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred."
      console.error("[AnalyzeCard]", message)
      setError(message)
      setIsAnalyzing(false)
      setCardState("idle")
      const job = JobStore.get()
      if (job?.status === "pending") JobStore.markFailed()
    }
  }, [projectName, isAnalyzing, wallet, onResult, setIsAnalyzing])

  // ── Wallet button label ───────────────────────────────────────────────────
  const walletButtonLabel =
    wallet.status === "unavailable"   ? "No wallet detected"
    : wallet.status === "connecting"  ? "Connecting…"
    : wallet.status === "switching"   ? "Switching network…"
    : wallet.status === "wrong_network" ? "Switch to GenLayer Studio"
    : wallet.account
      ? `${wallet.account.slice(0, 6)}…${wallet.account.slice(-4)}`
      : "Connect Wallet"

  const walletConnected = wallet.status === "connected"

  return (
    <motion.div className="w-full max-w-lg mx-auto px-4">
      <Card className="bg-card/80 backdrop-blur-xl overflow-hidden">
        <CardContent className="p-6 space-y-4">

          {/* Header */}
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Protocol Analysis</span>
          </div>

          {/* Wallet connect strip — visible when not connected and not analyzing */}
          <AnimatePresence>
            {!walletConnected && !isAnalyzing && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-border/60 bg-secondary/50 text-foreground hover:bg-secondary"
                  onClick={() => void wallet.connect()}
                  disabled={
                    wallet.status === "connecting" ||
                    wallet.status === "switching" ||
                    wallet.status === "unavailable"
                  }
                >
                  <Wallet className="mr-2 h-3.5 w-3.5" />
                  {walletButtonLabel}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Resume banner — rendered only after useEffect (avoids hydration mismatch) */}
          <AnimatePresence>
            {showResumeBanner && !isAnalyzing && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3"
              >
                <div className="flex items-start gap-2">
                  <RefreshCw className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <p className="text-xs text-amber-300 font-medium">
                      Analysis in progress
                    </p>
                    <p className="text-xs text-amber-300/70">
                      A previous analysis of{" "}
                      <span className="font-semibold text-amber-300">
                        {resumeProjectName}
                      </span>{" "}
                      is awaiting validator consensus. Reconnect your wallet to
                      retrieve the result.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs border-amber-500/40 text-amber-300 hover:bg-amber-500/10"
                      onClick={() => void handleResume()}
                    >
                      <RefreshCw className="mr-1.5 h-3 w-3" />
                      Reconnect &amp; Resume
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Input */}
          <Input
            placeholder="Enter project name (e.g. Uniswap, Terra)"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            disabled={isAnalyzing}
            onKeyDown={(e) => { if (e.key === "Enter") void handleAnalyze() }}
          />

          {/* Analyze button */}
          <Button
            onClick={() => void handleAnalyze()}
            disabled={
              isAnalyzing ||
              !projectName.trim() ||
              wallet.status === "connecting" ||
              wallet.status === "switching"
            }
            className="w-full"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {statusLabel || "Processing…"}
              </>
            ) : !walletConnected ? (
              <>
                <Wallet className="mr-2 h-4 w-4" />
                Connect Wallet to Analyze
              </>
            ) : (
              "Analyze"
            )}
          </Button>

          {/* Progress */}
          <AnimatePresence>
            {isAnalyzing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-2"
              >
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-primary rounded-full"
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">{statusLabel}</p>
                  <p className="text-xs text-muted-foreground font-mono">{progress}%</p>
                </div>
                {(cardState === "active" || cardState === "resuming") &&
                  txPhase !== "wallet" && txPhase !== "complete" && (
                    <p className="text-[10px] text-muted-foreground/60">
                      Validator consensus may take several minutes. You may close
                      this tab — your result will be retrievable on return.
                    </p>
                  )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error */}
          <AnimatePresence>
            {error && !isAnalyzing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3"
              >
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <p className="text-xs text-destructive">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

        </CardContent>
      </Card>
    </motion.div>
  )
}