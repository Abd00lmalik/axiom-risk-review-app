"use client"

import { useState, useCallback, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Zap, Loader2, RefreshCw, AlertCircle, Wallet, Eye } from "lucide-react"
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
import { PreviewGate } from "@/lib/preview-gate"
import { computePreviewScore } from "@/lib/preview-score"
import type { AnalysisMode } from "@/components/mode-selector"
import type { RiskReportResult } from "@/lib/types"

type CardState = "idle" | "research" | "active" | "complete" | "resuming"

interface AnalyzeCardProps {
  mode: AnalysisMode
  onResult: (result: RiskReportResult, resultMode: AnalysisMode) => void
  onPreviewUsed: () => void
  isAnalyzing: boolean
  setIsAnalyzing: (v: boolean) => void
}

export function AnalyzeCard({
  mode,
  onResult,
  onPreviewUsed,
  isAnalyzing,
  setIsAnalyzing,
}: AnalyzeCardProps) {
  const wallet = useWallet()

  const [projectName, setProjectName]               = useState("")
  const [cardState, setCardState]                   = useState<CardState>("idle")
  const [txPhase, setTxPhase]                       = useState<TxPhase>("wallet")
  const [error, setError]                           = useState<string | null>(null)
  const [showResumeBanner, setShowResumeBanner]     = useState(false)
  const [resumeProjectName, setResumeProjectName]   = useState("")

  // Hydration-safe: read localStorage only in useEffect — never during render
  useEffect(() => {
    const job = JobStore.get()
    if (!job) return
    if (job.status === "finalized" && job.result) {
      onResult(job.result, "verified")
      return
    }
    if (job.status === "pending") {
      setResumeProjectName(job.projectName)
      setShowResumeBanner(true)
    }
  }, [onResult])

  // Progress and label (verified/resuming path)
  const progress =
    cardState === "research"   ? 18
    : cardState === "active"   ? TX_PHASE_PROGRESS[txPhase]
    : cardState === "resuming" ? TX_PHASE_PROGRESS[txPhase]
    : cardState === "complete" ? 100
    : 0

  const statusLabel =
    cardState === "research"  ? (mode === "preview" ? "Running AI analysis…" : "Researching via Heurist Mesh…")
    : cardState === "active" || cardState === "resuming" ? TX_PHASE_LABEL[txPhase]
    : cardState === "complete" ? "Complete"
    : ""

  // ── Preview flow ──────────────────────────────────────────────────────────
  const handlePreview = useCallback(async () => {
    if (!projectName.trim() || isAnalyzing) return
    setError(null)
    setIsAnalyzing(true)
    setCardState("research")

    try {
      const apiRes = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectName: projectName.trim() }),
      })

      if (!apiRes.ok) {
        const body = await apiRes.json().catch(() => ({}))
        throw new Error((body as { message?: string }).message ?? "AI analysis failed")
      }

      const { claims } = await apiRes.json() as {
        claims: { yes: Record<string, string[]>; unknown: Record<string, string[]> }
      }

      const result = computePreviewScore(projectName.trim(), claims)
      PreviewGate.markUsed()
      onPreviewUsed()

      setCardState("complete")
      setTimeout(() => {
        setIsAnalyzing(false)
        setCardState("idle")
        onResult(result, "preview")
      }, 400)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "AI analysis failed."
      setError(message)
      setIsAnalyzing(false)
      setCardState("idle")
    }
  }, [projectName, isAnalyzing, onResult, onPreviewUsed, setIsAnalyzing])

  // ── Verified flow (unchanged from previous version) ───────────────────────
  const handleVerified = useCallback(async () => {
    if (!projectName.trim() || isAnalyzing) return

    if (wallet.status !== "connected") {
      try { await wallet.connect() } catch {
        setError("Please connect your wallet and switch to GenLayer Studio Network.")
        return
      }
      return // user will click Analyze again once connected
    }

    JobStore.clear()
    setError(null)
    setIsAnalyzing(true)
    setCardState("research")
    setShowResumeBanner(false)

    try {
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
        onResult(finalReport, "verified")
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

  // ── Resume flow ───────────────────────────────────────────────────────────
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
        onResult(outcome.result, "verified")
      }, 800)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Resume failed."
      setError(message)
      setIsAnalyzing(false)
      setCardState("idle")
      JobStore.markFailed()
    }
  }, [wallet, onResult, setIsAnalyzing])

  const handleAnalyze = mode === "preview" ? handlePreview : handleVerified

  // Wallet state helpers
  const walletConnected = wallet.status === "connected"
  const walletBusy      = wallet.status === "connecting" || wallet.status === "switching"
  const showWalletStrip = mode === "verified" && !walletConnected && !isAnalyzing

  const walletLabel =
    wallet.status === "connecting"    ? "Connecting…"
    : wallet.status === "switching"   ? "Switching network…"
    : wallet.status === "wrong_network" ? "Switch to GenLayer Studio"
    : walletConnected && wallet.account
      ? `${wallet.account.slice(0, 6)}…${wallet.account.slice(-4)}`
    : wallet.status === "unavailable" ? "No wallet detected"
    : "Connect Wallet"

  const buttonLabel =
    isAnalyzing          ? (statusLabel || "Processing…")
    : mode === "preview" ? "Run AI Preview"
    : !walletConnected   ? "Connect Wallet to Analyze"
    : "Analyze"

  return (
    <motion.div className="w-full max-w-lg mx-auto px-4">
      <Card className={`backdrop-blur-xl overflow-hidden ${
        mode === "preview" ? "bg-card/70 border-amber-500/20" : "bg-card/80"
      }`}>
        <CardContent className="p-6 space-y-4">

          <div className="flex items-center gap-2">
            {mode === "preview"
              ? <Eye className="h-4 w-4 text-amber-400" />
              : <Zap className="h-4 w-4 text-primary" />
            }
            <span className="text-sm font-medium">
              {mode === "preview" ? "AI Preview Analysis" : "Protocol Analysis"}
            </span>
          </div>

          <AnimatePresence>
            {showWalletStrip && (
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
                  disabled={walletBusy || wallet.status === "unavailable"}
                >
                  <Wallet className="mr-2 h-3.5 w-3.5" />
                  {walletLabel}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showResumeBanner && !isAnalyzing && mode === "verified" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3"
              >
                <div className="flex items-start gap-2">
                  <RefreshCw className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <p className="text-xs text-amber-300 font-medium">Analysis in progress</p>
                    <p className="text-xs text-amber-300/70">
                      A previous analysis of{" "}
                      <span className="font-semibold text-amber-300">{resumeProjectName}</span>{" "}
                      is awaiting validator consensus.
                    </p>
                    <Button
                      size="sm" variant="outline"
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

          <Input
            placeholder="Enter project name (e.g. Uniswap, Terra)"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            disabled={isAnalyzing}
            onKeyDown={(e) => { if (e.key === "Enter") void handleAnalyze() }}
            className={mode === "preview" ? "border-amber-500/20 focus-visible:ring-amber-500/30" : ""}
          />

          <Button
            onClick={() => void handleAnalyze()}
            disabled={isAnalyzing || !projectName.trim() || walletBusy}
            className={`w-full ${mode === "preview"
              ? "bg-amber-500 hover:bg-amber-400 text-black border-0 font-semibold"
              : ""}`}
            variant={mode === "preview" ? "outline" : "default"}
          >
            {isAnalyzing ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{buttonLabel}</>
            ) : mode === "preview" ? (
              <><Eye className="mr-2 h-4 w-4" />{buttonLabel}</>
            ) : !walletConnected ? (
              <><Wallet className="mr-2 h-4 w-4" />{buttonLabel}</>
            ) : buttonLabel}
          </Button>

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
                    className={`h-full rounded-full ${mode === "preview" ? "bg-amber-500" : "bg-primary"}`}
                    animate={{ width: mode === "preview" ? "100%" : `${progress}%` }}
                    transition={mode === "preview"
                      ? { duration: 8, ease: "linear" }
                      : { duration: 0.6, ease: "easeOut" }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">{statusLabel}</p>
                {mode === "verified" &&
                  (cardState === "active" || cardState === "resuming") &&
                  txPhase !== "wallet" && txPhase !== "complete" && (
                    <p className="text-[10px] text-muted-foreground/60">
                      Validator consensus may take several minutes. You may close
                      this tab — your result will be retrievable on return.
                    </p>
                  )}
              </motion.div>
            )}
          </AnimatePresence>

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