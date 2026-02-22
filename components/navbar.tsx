"use client"

import { motion, useScroll, useTransform } from "framer-motion"
import { Wallet, Menu, X, CheckCircle2, AlertTriangle } from "lucide-react"
import { AxiomLogo } from "@/components/axiom-logo"
import { useWallet } from "@/lib/use-wallet"
import { useState } from "react"

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const wallet = useWallet()
  const { scrollY } = useScroll()
  const bgOpacity     = useTransform(scrollY, [0, 80], [0, 0.94])
  const borderOpacity = useTransform(scrollY, [0, 80], [0, 1])

  const isConnected    = wallet.status === "connected"
  const isBusy         = wallet.status === "connecting" || wallet.status === "switching"
  const isWrongNetwork = wallet.status === "wrong_network"
  const isUnavailable  = wallet.status === "unavailable"

  const walletLabel =
    wallet.status === "connecting"    ? "Connecting…"
    : wallet.status === "switching"   ? "Switching…"
    : isWrongNetwork                  ? "Wrong Network"
    : isConnected && wallet.account   ? `${wallet.account.slice(0, 6)}…${wallet.account.slice(-4)}`
    : isUnavailable                   ? "No Wallet"
    : "Connect Wallet"

  const WalletIcon = isConnected ? CheckCircle2 : isWrongNetwork ? AlertTriangle : Wallet

  function handleWalletClick() {
    if (!isConnected || isWrongNetwork) void wallet.connect()
  }

  return (
    <motion.header className="fixed top-0 left-0 right-0 z-50">
      <motion.div
        className="absolute inset-0"
        style={{
          background: "hsl(220 30% 4%)",
          opacity: bgOpacity,
          backdropFilter: "blur(20px) saturate(180%)",
        }}
      />
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{
          background: "linear-gradient(90deg, transparent 0%, hsl(197 100% 47% / 0.4) 50%, transparent 100%)",
          opacity: borderOpacity,
        }}
      />

      <nav className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <a href="/" className="flex items-center">
          <AxiomLogo size={26} showWordmark />
        </a>

        {/* Status pill */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/50 bg-secondary/30">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: "hsl(197 100% 47%)" }} />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: "hsl(197 100% 47%)" }} />
          </span>
          <span className="text-[10px] font-mono tracking-widest uppercase text-muted-foreground">
            GenLayer Live
          </span>
        </div>

        {/* Wallet button */}
        <div className="hidden md:flex">
          <button
            onClick={handleWalletClick}
            disabled={isBusy || isUnavailable}
            className={[
              "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono tracking-wide",
              "border transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed",
              isConnected
                ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-400 hover:border-emerald-500/50 hover:bg-emerald-500/10"
                : isWrongNetwork
                ? "border-amber-500/30 bg-amber-500/5 text-amber-400 hover:border-amber-500/50"
                : "border-border bg-secondary/40 text-muted-foreground hover:border-[hsl(197_100%_47%/0.4)] hover:text-foreground",
            ].join(" ")}
          >
            <WalletIcon className={`h-3.5 w-3.5 ${isBusy ? "animate-pulse" : ""}`} />
            {walletLabel}
          </button>
        </div>

        <button
          className="md:hidden text-muted-foreground hover:text-foreground transition-colors p-1"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "Close" : "Menu"}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative border-t border-border/40 px-6 py-4 md:hidden"
          style={{ background: "hsl(220 30% 4% / 0.97)" }}
        >
          <button
            onClick={handleWalletClick}
            disabled={isBusy || isUnavailable}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg
              border border-border bg-secondary/40 text-sm font-mono text-muted-foreground
              hover:text-foreground transition-all"
          >
            <WalletIcon className="h-4 w-4" />
            {walletLabel}
          </button>
        </motion.div>
      )}
    </motion.header>
  )
}