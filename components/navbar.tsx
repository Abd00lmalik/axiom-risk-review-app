"use client"

import { motion, useScroll, useTransform } from "framer-motion"
import { Wallet, Menu, X, CheckCircle2, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AxiomLogo } from "./axiom-logo"
import { useWallet } from "@/lib/use-wallet"
import { useState } from "react"

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const wallet = useWallet()

  const { scrollY } = useScroll()
  const backdropBlur = useTransform(scrollY, [0, 100], ["blur(8px)", "blur(16px)"])
  const bgOpacity    = useTransform(scrollY, [0, 100], [0.5, 0.85])
  const padding      = useTransform(scrollY, [0, 100], ["1rem", "0.75rem"])

  const isConnected    = wallet.status === "connected"
  const isBusy         = wallet.status === "connecting" || wallet.status === "switching"
  const isWrongNetwork = wallet.status === "wrong_network"
  const isUnavailable  = wallet.status === "unavailable"

  const walletLabel =
    wallet.status === "connecting"   ? "Connecting…"
    : wallet.status === "switching"  ? "Switching…"
    : isWrongNetwork                 ? "Wrong Network"
    : isConnected && wallet.account  ? `${wallet.account.slice(0, 6)}…${wallet.account.slice(-4)}`
    : isUnavailable                  ? "No Wallet"
    : "Connect Wallet"

  const WalletIcon = isConnected ? CheckCircle2 : isWrongNetwork ? AlertTriangle : Wallet

  const walletClassName = [
    "border-border/60 bg-secondary/50 text-foreground hover:bg-secondary hover:text-foreground",
    isConnected    ? "border-emerald-500/30 text-emerald-400 hover:text-emerald-400" : "",
    isWrongNetwork ? "border-amber-500/30 text-amber-400 hover:text-amber-400"       : "",
  ].join(" ")

  function handleWalletClick() {
    if (!isConnected || isWrongNetwork) void wallet.connect()
  }

  return (
    <motion.header
      className="fixed top-0 left-0 right-0 z-50 border-b border-border/50"
      style={{ backdropFilter: backdropBlur, WebkitBackdropFilter: backdropBlur }}
    >
      <motion.div
        className="absolute inset-0"
        style={{ backgroundColor: "hsl(222 47% 5%)", opacity: bgOpacity }}
      />

      <motion.nav
        className="relative mx-auto flex max-w-6xl items-center justify-between px-4 lg:px-6"
        style={{ paddingTop: padding, paddingBottom: padding }}
      >
        {/* Logo */}
        <a href="/" className="flex items-center">
          <AxiomLogo size={26} showWordmark />
        </a>

        {/* Desktop wallet button */}
        <div className="hidden items-center gap-3 md:flex">
          <Button
            variant="outline"
            size="sm"
            className={walletClassName}
            onClick={handleWalletClick}
            disabled={isBusy || isUnavailable}
            title={
              isConnected      ? `Connected: ${wallet.account ?? ""}`
              : isWrongNetwork ? "Click to switch to GenLayer Studio Network"
              : isUnavailable  ? "No wallet extension detected"
              : "Connect to GenLayer Studio Network"
            }
          >
            <WalletIcon className={`mr-2 h-4 w-4 ${isBusy ? "animate-pulse" : ""}`} />
            {walletLabel}
          </Button>
        </div>

        {/* Mobile hamburger */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden text-foreground"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </motion.nav>

      {/* Mobile drawer */}
      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="relative border-t border-border/30 px-4 py-4 md:hidden"
          style={{ backgroundColor: "hsl(222 47% 6% / 0.95)" }}
        >
          <Button
            variant="outline"
            className={`w-full ${walletClassName}`}
            onClick={handleWalletClick}
            disabled={isBusy || isUnavailable}
          >
            <WalletIcon className={`mr-2 h-4 w-4 ${isBusy ? "animate-pulse" : ""}`} />
            {walletLabel}
          </Button>
        </motion.div>
      )}
    </motion.header>
  )
}