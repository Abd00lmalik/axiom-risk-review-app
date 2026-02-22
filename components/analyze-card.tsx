"use client"

import { useState, useCallback, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Zap, Loader2, RefreshCw, AlertCircle, Wallet, Eye, Terminal } from "lucide-react"
import { Input } from "@/components/ui/input"
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

export function AnalyzeCard({ mode, onResult, onPreviewUsed, isAnalyzing, setIsAnalyzing }: AnalyzeCardProps) {
  const wallet = useWallet()
  const [projectName, setProjectName]             = useState("")
  const [cardState, setCardState]                 = useState<CardState>("idle")
  const [txPhase, setTxPhase]                     = useState<TxPhase>("wallet")
  const [error, setError]                         = useState<string | null>(null)
  const [showResumeBanner, setShowResumeBanner]   = useState(false)
  const [resumeProjectName, setResumeProjectName] = useState("")

  // Hydration-safe — read localStorage only after mount
  useEffect(() => {
    const job = JobStore.get()
    if (!job) return
    if (job.status === "finalized" && job.result) { onResult(job.result, "verified"); return }
    if (job.status === "pending") { setResumeProjectName(job.projectName); setShowResumeBanner(true) }
  }, [onResult])

  const progress =
    cardState === "research"   ? 18
    : cardState === "active"   ? TX_PHASE_PROGRESS[txPhase]
    : cardState === "resuming" ? TX_PHASE_PROGRESS[txPhase]
    : cardState === "complete" ? 100
    : 0

  const statusLabel =
    cardState === "research"
      ? (mode === "preview" ? "AI analysis via Heurist Mesh…" : "Researching via Heurist Mesh…")
      : cardState === "active" || cardState === "resuming"
      ? TX_PHASE_LABEL[txPhase]
      : cardState === "complete" ? "Complete"
      : ""

  // ── Preview flow ──────────────────────────────────────────────────────────
  const handlePreview = useCallback(async () => {
    if (!projectName.trim() || isAnalyzing) return
    setError(null); setIsAnalyzing(true); setCardState("research")
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
      setTimeout(() => { setIsAnalyzing(false); setCardState("idle"); onResult(result, "preview") }, 400)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "AI analysis failed.")
      setIsAnalyzing(false); setCardState("idle")
    }
  }, [projectName, isAnalyzing, onResult, onPreviewUsed, setIsAnalyzing])

  // ── Verified flow ─────────────────────────────────────────────────────────
  const handleVerified = useCallback(async () => {
    if (!projectName.trim() || isAnalyzing) return
    if (wallet.status !== "connected") {
      try { await wallet.connect() } catch {
        setError("Connect your wallet and switch to GenLayer Studio Network.")
        return
      }
      return
    }
    JobStore.clear(); setError(null); setIsAnalyzing(true)
    setCardState("research"); setShowResumeBanner(false)
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
      setCardState("active"); setTxPhase("wallet")
      const finalReport = await submitClaimsAndFetchReport(
        projectName.trim(), proposerResult, (phase) => setTxPhase(phase)
      )
      setCardState("complete")
      setTimeout(() => { setIsAnalyzing(false); setCardState("idle"); onResult(finalReport, "verified") }, 800)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unexpected error."
      console.error("[AnalyzeCard]", msg); setError(msg)
      setIsAnalyzing(false); setCardState("idle")
      const job = JobStore.get(); if (job?.status === "pending") JobStore.markFailed()
    }
  }, [projectName, isAnalyzing, wallet, onResult, setIsAnalyzing])

  // ── Resume flow ───────────────────────────────────────────────────────────
  const handleResume = useCallback(async () => {
    const job = JobStore.get(); if (!job || job.status !== "pending") return
    setError(null); setIsAnalyzing(true); setCardState("resuming")
    setTxPhase("pending"); setShowResumeBanner(false)
    try {
      if (wallet.status !== "connected") await wallet.connect()
      const outcome = await resumePendingJob((phase) => setTxPhase(phase))
      if (!outcome) throw new Error("Could not reconnect. Ensure MetaMask is on GenLayer Studionet.")
      setCardState("complete")
      setTimeout(() => { setIsAnalyzing(false); setCardState("idle"); onResult(outcome.result, "verified") }, 800)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Resume failed.")
      setIsAnalyzing(false); setCardState("idle"); JobStore.markFailed()
    }
  }, [wallet, onResult, setIsAnalyzing])

  const handleAnalyze  = mode === "preview" ? handlePreview : handleVerified
  const isPreview      = mode === "preview"
  const walletConn     = wallet.status === "connected"
  const walletBusy     = wallet.status === "connecting" || wallet.status === "switching"
  const showWallet     = mode === "verified" && !walletConn && !isAnalyzing
  const accentCss      = isPreview ? "hsl(38,92%,50%)" : "hsl(197,100%,47%)"

  const walletLabel =
    wallet.status === "connecting"      ? "Connecting…"
    : wallet.status === "switching"     ? "Switching network…"
    : wallet.status === "wrong_network" ? "Switch to GenLayer Studio"
    : walletConn && wallet.account      ? `${wallet.account.slice(0, 6)}…${wallet.account.slice(-4)}`
    : wallet.status === "unavailable"   ? "No wallet detected"
    : "Connect Wallet"

  const btnLabel =
    isAnalyzing         ? (statusLabel || "Processing…")
    : isPreview         ? "Run AI Preview"
    : !walletConn       ? "Connect Wallet to Analyze"
    : "Analyze"

  return (
    <motion.div
      className="w-full max-w-lg mx-auto px-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15 }}
    >
      <div
        className="relative overflow-hidden rounded-2xl"
        style={{
          background: "linear-gradient(135deg, hsl(222 28% 6% / 0.96), hsl(220 30% 7% / 0.92))",
          border: `1px solid ${isPreview ? "hsl(38 92% 50% / 0.2)" : "hsl(197 100% 47% / 0.2)"}`,
          boxShadow: isPreview
            ? "0 0 40px hsl(38 92% 50% / 0.06), inset 0 1px 0 hsl(38 92% 50% / 0.06)"
            : "0 0 40px hsl(197 100% 47% / 0.06), inset 0 1px 0 hsl(197 100% 47% / 0.06)",
          backdropFilter: "blur(24px)",
        }}
      >
        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-px" style={{
          background: `linear-gradient(90deg, transparent, ${accentCss}80, transparent)`,
        }} />

        <div className="p-6 space-y-4">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isPreview
                ? <Eye className="h-3.5 w-3.5" style={{ color: accentCss }} />
                : <Terminal className="h-3.5 w-3.5" style={{ color: accentCss }} />
              }
              <span className="text-[11px] font-mono tracking-widest uppercase" style={{ color: accentCss, opacity: 0.8 }}>
                {isPreview ? "AI Preview" : "Protocol Analysis"}
              </span>
            </div>
            {isAnalyzing && (
              <span className="text-[9px] font-mono tracking-widest text-muted-foreground/40 animate-pulse uppercase">
                Processing
              </span>
            )}
          </div>

          {/* Wallet connect strip */}
          <AnimatePresence>
            {showWallet && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                <button
                  onClick={() => void wallet.connect()}
                  disabled={walletBusy || wallet.status === "unavailable"}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                    text-xs font-mono tracking-wide border border-border/60 bg-secondary/20
                    text-muted-foreground hover:border-[hsl(197_100%_47%/0.35)] hover:text-foreground
                    transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Wallet className="h-3.5 w-3.5" />
                  {walletLabel}
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Resume banner */}
          <AnimatePresence>
            {showResumeBanner && !isAnalyzing && mode === "verified" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                className="rounded-xl p-3 space-y-2"
                style={{ background: "hsl(38 92% 50% / 0.07)", border: "1px solid hsl(38 92% 50% / 0.22)" }}
              >
                <div className="flex items-start gap-2">
                  <RefreshCw className="h-3.5 w-3.5 text-amber-400 mt-0.5 shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <p className="text-[11px] font-mono font-semibold text-amber-300">Analysis in progress</p>
                    <p className="text-[10px] font-mono text-amber-300/55">
                      Previous analysis of <span className="text-amber-300">{resumeProjectName}</span> awaiting consensus.
                    </p>
                    <button onClick={() => void handleResume()}
                      className="text-[10px] font-mono text-amber-400/60 hover:text-amber-400 transition-colors flex items-center gap-1">
                      <RefreshCw className="h-2.5 w-2.5" /> Reconnect &amp; Resume
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Input */}
          <Input
            placeholder="Enter project name  (e.g. Uniswap, Terra)"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            disabled={isAnalyzing}
            onKeyDown={(e) => { if (e.key === "Enter") void handleAnalyze() }}
            className="font-mono text-sm h-11 bg-secondary/20 border-border/50 placeholder:text-muted-foreground/25
              focus-visible:ring-0 focus-visible:border-[hsl(197_100%_47%/0.4)]"
          />

          {/* Analyze button */}
          <button
            onClick={() => void handleAnalyze()}
            disabled={isAnalyzing || !projectName.trim() || walletBusy}
            className="w-full flex items-center justify-center gap-2 h-11 rounded-xl
              text-sm font-bold tracking-wide transition-all duration-200
              disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
            style={{
              fontFamily: "'Syne', system-ui, sans-serif",
              background: isAnalyzing
                ? "hsl(220 25% 11%)"
                : isPreview
                ? "linear-gradient(135deg, hsl(38 92% 50%), hsl(38 85% 44%))"
                : "linear-gradient(135deg, hsl(197 100% 47%), hsl(210 95% 45%))",
              color: isAnalyzing ? "hsl(215 20% 40%)" : "hsl(220 30% 4%)",
              boxShadow: !isAnalyzing && !projectName.trim() ? "none"
                : !isAnalyzing
                ? isPreview
                  ? "0 0 24px hsl(38 92% 50% / 0.3), 0 4px 16px hsl(38 92% 50% / 0.15)"
                  : "0 0 24px hsl(197 100% 47% / 0.3), 0 4px 16px hsl(197 100% 47% / 0.15)"
                : "none",
            }}
          >
            {isAnalyzing ? <><Loader2 className="h-4 w-4 animate-spin" /><span>{btnLabel}</span></>
              : isPreview ? <><Eye className="h-4 w-4" /><span>{btnLabel}</span></>
              : !walletConn ? <><Wallet className="h-4 w-4" /><span>{btnLabel}</span></>
              : <><Zap className="h-4 w-4" /><span>{btnLabel}</span></>
            }
          </button>

          {/* Progress bar */}
          <AnimatePresence>
            {isAnalyzing && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
                <div className="h-px w-full rounded-full overflow-hidden bg-border/40">
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      background: `linear-gradient(90deg, ${accentCss}, ${isPreview ? "hsl(38 85% 42%)" : "hsl(213 94% 60%)"})`,
                      boxShadow: `0 0 8px ${accentCss}60`,
                    }}
                    animate={{ width: isPreview ? "100%" : `${progress}%` }}
                    transition={isPreview
                      ? { duration: 14, ease: "linear" }
                      : { duration: 0.55, ease: "easeOut" }}
                  />
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-[10px] font-mono text-muted-foreground/60">{statusLabel}</p>
                  {!isPreview && (
                    <p className="text-[10px] font-mono text-muted-foreground/35">{progress}%</p>
                  )}
                </div>
                {mode === "verified" && (cardState === "active" || cardState === "resuming") &&
                  txPhase !== "wallet" && txPhase !== "complete" && (
                  <p className="text-[10px] font-mono text-muted-foreground/30 leading-relaxed">
                    Validator consensus takes several minutes. You may close this tab safely.
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error */}
          <AnimatePresence>
            {error && !isAnalyzing && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex items-start gap-2 rounded-xl p-3"
                style={{ background: "hsl(0 72% 51% / 0.08)", border: "1px solid hsl(0 72% 51% / 0.25)" }}
              >
                <AlertCircle className="h-3.5 w-3.5 text-red-400 mt-0.5 shrink-0" />
                <p className="text-[11px] font-mono text-red-400/75">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </motion.div>
  )
}