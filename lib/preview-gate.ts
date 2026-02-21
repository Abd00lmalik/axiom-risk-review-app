/**
 * lib/preview-gate.ts
 *
 * One-time use enforcement for AI Preview Mode.
 *
 * Storage: localStorage key "axiom_preview_used_v1"
 *
 * Honest limitation: localStorage can be cleared by the user.
 * This is intentional — the same pattern used by every major freemium
 * web product. A backend gate would require authentication infrastructure
 * that is out of scope and adds friction that hurts the demo flow.
 * The gate is a UX signal ("this is a one-time preview"), not a
 * cryptographic enforcement.
 *
 * The key is versioned so a future backend gate can be introduced
 * without conflicting with cached client state.
 */

const KEY = "axiom_preview_used_v1"

export const PreviewGate = {
  /**
   * Returns true if the user has already used Preview Mode.
   * Always returns false on the server (SSR safe).
   */
  isUsed(): boolean {
    if (typeof window === "undefined") return false
    try {
      return window.localStorage.getItem(KEY) === "1"
    } catch {
      return false
    }
  },

  /**
   * Marks Preview Mode as used.
   * Call this after the preview result is successfully displayed.
   */
  markUsed(): void {
    if (typeof window === "undefined") return
    try {
      window.localStorage.setItem(KEY, "1")
    } catch {
      // localStorage blocked — acceptable, gate degrades gracefully
    }
  },

  /**
   * Resets the gate. Only used in development.
   */
  reset(): void {
    if (typeof window === "undefined") return
    try {
      window.localStorage.removeItem(KEY)
    } catch {
      // ignore
    }
  },
}