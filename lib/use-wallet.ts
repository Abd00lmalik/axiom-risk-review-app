"use client"

/**
 * lib/use-wallet.ts
 *
 * Shared wallet connection hook.
 *
 * Handles:
 * - Detecting injected wallet (MetaMask, Rabby, etc.)
 * - Requesting accounts
 * - Adding GenLayer Studio network if not present
 * - Switching to GenLayer Studio network
 * - Exposing connection state to UI
 *
 * Used by: Navbar (Connect Wallet button) and AnalyzeCard (pre-analysis gate)
 */

import { useState, useEffect, useCallback } from "react"

// ─────────────────────────────────────────────────────────────────────────────
// GenLayer Studio network params
// chainId 61999 decimal = 0xF22F hex
// ─────────────────────────────────────────────────────────────────────────────

const GENLAYER_CHAIN = {
  chainId: "0xF22F",
  chainName: "Genlayer Studio Network",
  rpcUrls: ["https://studio.genlayer.com/api"],
  blockExplorerUrls: ["https://genlayer-explorer.vercel.app"],
  nativeCurrency: {
    name: "GEN",
    symbol: "GEN",
    decimals: 18,
  },
} as const

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type WalletStatus =
  | "unavailable"   // No injected wallet detected
  | "disconnected"  // Wallet present, not connected
  | "connecting"    // Request in flight
  | "switching"     // Network switch in flight
  | "connected"     // Connected to GenLayer Studio network
  | "wrong_network" // Connected to a different network

export interface WalletState {
  status: WalletStatus
  account: string | null
  /** Call this to connect + switch to the correct network */
  connect: () => Promise<void>
  error: string | null
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper — safe ethereum provider access
// ─────────────────────────────────────────────────────────────────────────────

type EthProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
  on: (event: string, handler: (...args: unknown[]) => void) => void
  removeListener: (event: string, handler: (...args: unknown[]) => void) => void
}

function getProvider(): EthProvider | null {
  if (typeof window === "undefined") return null
  const eth = (window as unknown as Record<string, unknown>).ethereum
  return (eth as EthProvider) ?? null
}

// ─────────────────────────────────────────────────────────────────────────────
// Add or switch to GenLayer Studio network
// ─────────────────────────────────────────────────────────────────────────────

async function ensureNetwork(provider: EthProvider): Promise<void> {
  try {
    // Try switching first — works if the network is already added
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: GENLAYER_CHAIN.chainId }],
    })
  } catch (switchErr: unknown) {
    // Error code 4902 = chain not added yet
    const code = (switchErr as { code?: number })?.code
    if (code === 4902) {
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [GENLAYER_CHAIN],
      })
    } else {
      throw switchErr
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useWallet(): WalletState {
  const [status, setStatus] = useState<WalletStatus>("disconnected")
  const [account, setAccount] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // ── Initialise on mount ───────────────────────────────────────────────────
  useEffect(() => {
    const provider = getProvider()

    if (!provider) {
      setStatus("unavailable")
      return
    }

    // Check if already connected (no prompt)
    provider
      .request({ method: "eth_accounts" })
      .then((accounts) => {
        const list = accounts as string[]
        if (list.length > 0) {
          setAccount(list[0])
          // Check current chain
          provider
            .request({ method: "eth_chainId" })
            .then((chainId) => {
              setStatus(
                chainId === GENLAYER_CHAIN.chainId ? "connected" : "wrong_network"
              )
            })
            .catch(() => setStatus("wrong_network"))
        } else {
          setStatus("disconnected")
        }
      })
      .catch(() => setStatus("disconnected"))

    // ── Listen for account / chain changes ───────────────────────────────────
    const onAccountsChanged = (accounts: unknown) => {
      const list = accounts as string[]
      if (list.length === 0) {
        setAccount(null)
        setStatus("disconnected")
      } else {
        setAccount(list[0])
      }
    }

    const onChainChanged = (chainId: unknown) => {
      setStatus(
        (chainId as string) === GENLAYER_CHAIN.chainId
          ? "connected"
          : "wrong_network"
      )
    }

    provider.on("accountsChanged", onAccountsChanged)
    provider.on("chainChanged", onChainChanged)

    return () => {
      provider.removeListener("accountsChanged", onAccountsChanged)
      provider.removeListener("chainChanged", onChainChanged)
    }
  }, [])

  // ── Connect handler ───────────────────────────────────────────────────────
  const connect = useCallback(async () => {
    setError(null)
    const provider = getProvider()

    if (!provider) {
      setError("No wallet detected. Please install MetaMask.")
      setStatus("unavailable")
      return
    }

    try {
      setStatus("connecting")

      const accounts = await provider.request({
        method: "eth_requestAccounts",
      }) as string[]

      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts returned.")
      }

      setAccount(accounts[0])
      setStatus("switching")

      await ensureNetwork(provider)

      setStatus("connected")
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Wallet connection failed."
      // User rejected — don't treat as hard error, just return to disconnected
      setError(msg)
      setStatus(account ? "wrong_network" : "disconnected")
    }
  }, [account])

  return { status, account, connect, error }
}