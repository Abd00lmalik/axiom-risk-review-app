import { NextRequest, NextResponse } from "next/server"

const HEURIST_API_URL = "https://mesh.heurist.xyz/mesh_request"
const EXA_AGENT = "ExaSearchAgent"

type TierKey = "existential" | "structural" | "operational" | "contextual"
type Signal = "YES" | "NO" | "UNKNOWN"

interface TierQuestion {
  tier: TierKey
  label: string
  question: (project: string) => string
}

// ─────────────────────────────────────────────────────────────────────────────
// Questions
//
// Rules applied:
//   - ExaSearchAgent / exa_answer_question only (no Firecrawl)
//   - One API call per question
//   - Tier 2/3 questions kept only where verifiable from public web data
//   - Each prompt explicitly requests YES / NO / UNKNOWN as the final word
// ─────────────────────────────────────────────────────────────────────────────

const QUESTIONS: TierQuestion[] = [
  // ── TIER 1: EXISTENTIAL (weight 5) ───────────────────────────────────────
  {
    tier: "existential",
    label: "Anonymous or unverifiable founders",
    question: (p) =>
      `Research the blockchain/crypto project "${p}". Are the founders or core team members anonymous, pseudonymous, or impossible to verify from public sources? No real names, LinkedIn profiles, or confirmed professional histories. Answer with exactly one word on the last line: YES, NO, or UNKNOWN.`,
  },
  {
    tier: "existential",
    label: "No clear ownership or governance structure",
    question: (p) =>
      `Research the blockchain/crypto project "${p}". Does the project lack any publicly documented ownership or governance structure — no DAO, no published multisig, no governance docs? Answer with exactly one word on the last line: YES, NO, or UNKNOWN.`,
  },
  {
    tier: "existential",
    label: "Misrepresentation of audits or partnerships",
    question: (p) =>
      `Research the blockchain/crypto project "${p}". Is there any public record of this project misrepresenting, fabricating, or exaggerating security audits or partner relationships? Answer with exactly one word on the last line: YES, NO, or UNKNOWN.`,
  },
  {
    tier: "existential",
    label: "Critical dependency on single off-chain service with no fallback",
    question: (p) =>
      `Research the blockchain/crypto project "${p}". Does the protocol critically depend on a single centralized off-chain service with no documented fallback or redundancy? Answer with exactly one word on the last line: YES, NO, or UNKNOWN.`,
  },
  {
    tier: "existential",
    label: "Explicit warnings from reputable security researchers or auditors",
    question: (p) =>
      `Research the blockchain/crypto project "${p}". Have reputable security researchers, audit firms (Trail of Bits, OpenZeppelin, Certik, etc.), or on-chain analytics platforms issued explicit public warnings or critical findings about this project? Answer with exactly one word on the last line: YES, NO, or UNKNOWN.`,
  },

  // ── TIER 2: STRUCTURAL (weight 3) ────────────────────────────────────────
  // Only questions verifiable from published tokenomics or docs
  {
    tier: "structural",
    label: "No clear token utility beyond speculation",
    question: (p) =>
      `Research the blockchain/crypto project "${p}". Based on published documentation or tokenomics, does the project's token serve no clear technical function within the protocol — it is not required for any meaningful protocol action? Answer with exactly one word on the last line: YES, NO, or UNKNOWN.`,
  },
  {
    tier: "structural",
    label: "Economic model depends on constant new capital inflow",
    question: (p) =>
      `Research the blockchain/crypto project "${p}". Does the project's economic model or advertised yield rely on continuous new investor capital rather than genuine protocol revenue? Answer with exactly one word on the last line: YES, NO, or UNKNOWN.`,
  },

  // ── TIER 3: OPERATIONAL (weight 2) ───────────────────────────────────────
  // Only questions observable from GitHub or public channels
  {
    tier: "operational",
    label: "Infrequent or stalled development activity",
    question: (p) =>
      `Research the blockchain/crypto project "${p}". Is the project's public development activity — GitHub commits, release notes, changelogs — infrequent or effectively stalled over the past 6 months? Answer with exactly one word on the last line: YES, NO, or UNKNOWN.`,
  },
  {
    tier: "operational",
    label: "Poor or significantly outdated documentation",
    question: (p) =>
      `Research the blockchain/crypto project "${p}". Is the project's publicly available technical documentation poor quality, incomplete, or significantly outdated? Answer with exactly one word on the last line: YES, NO, or UNKNOWN.`,
  },

  // ── TIER 4: CONTEXTUAL (weight 1) ────────────────────────────────────────
  {
    tier: "contextual",
    label: "Pre-mainnet or testnet only",
    question: (p) =>
      `Research the blockchain/crypto project "${p}". Is the project currently operating only on testnet or in a pre-mainnet state, without a live production mainnet? Answer with exactly one word on the last line: YES, NO, or UNKNOWN.`,
  },
  {
    tier: "contextual",
    label: "Recently launched (under 12 months)",
    question: (p) =>
      `Research the blockchain/crypto project "${p}". Was this project's mainnet or primary product launched within the last 12 months? Answer with exactly one word on the last line: YES, NO, or UNKNOWN.`,
  },
  {
    tier: "contextual",
    label: "No independent security audits published",
    question: (p) =>
      `Research the blockchain/crypto project "${p}". Has the project NOT published any independent security audit from a recognized firm? Answer with exactly one word on the last line: YES, NO, or UNKNOWN.`,
  },
  {
    tier: "contextual",
    label: "Sparse ecosystem integrations or third-party coverage",
    question: (p) =>
      `Research the blockchain/crypto project "${p}". Does the project have very few ecosystem integrations, protocol partnerships, or independent third-party media coverage? Answer with exactly one word on the last line: YES, NO, or UNKNOWN.`,
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Heurist helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Read response body as text, parse as JSON.
 * Returns null on empty body, malformed JSON, or any thrown error.
 * Never throws.
 */
async function safeParseResponse(response: Response): Promise<unknown> {
  try {
    const text = await response.text()
    if (!text || text.trim() === "") return null
    return JSON.parse(text)
  } catch {
    return null
  }
}

/**
 * Walk the known response paths from ExaSearchAgent exa_answer_question.
 * Heurist's exact shape varies between versions — check all known paths.
 */
function extractAnswerText(data: unknown): string {
  if (!data || typeof data !== "object") return ""
  const d = data as Record<string, unknown>
  const candidates: unknown[] = [
    (d?.result as Record<string, unknown>)?.answer,
    (d?.result as Record<string, unknown>)?.data,
    ((d?.result as Record<string, unknown>)?.data as Record<string, unknown>)?.answer,
    (d?.data as Record<string, unknown>)?.answer,
    ((d?.data as Record<string, unknown>)?.data as Record<string, unknown>)?.answer,
    d?.response,
  ]
  for (const c of candidates) {
    if (c && typeof c === "string" && c.trim() !== "") return c.trim()
  }
  return ""
}

/**
 * Map raw answer text to Signal.
 *
 * Strategy:
 *   1. Read the last non-empty line (prompt asks for answer there)
 *   2. Take the last word of that line
 *   3. Exact match YES / NO / UNKNOWN
 *   4. Fallback: scan full text for explicit keyword presence
 *   5. Truly ambiguous → UNKNOWN (never silently drop to NO)
 */
function parseSignal(raw: string): Signal {
  if (!raw) return "UNKNOWN"

  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean)
  const lastLine = lines[lines.length - 1] ?? ""
  const lastWord = lastLine.split(/\s+/).pop()?.toUpperCase().replace(/[^A-Z]/g, "") ?? ""

  if (lastWord === "YES") return "YES"
  if (lastWord === "NO") return "NO"
  if (lastWord === "UNKNOWN") return "UNKNOWN"

  // Fallback scan — order matters: YES before UNKNOWN before NO
  const upper = raw.toUpperCase()
  if (upper.match(/\bYES\b/)) return "YES"
  if (upper.match(/\bUNKNOWN\b/)) return "UNKNOWN"
  if (upper.match(/\bNO\b/)) return "NO"

  // Completely unparseable → UNKNOWN (insufficient data, not negative confirmation)
  return "UNKNOWN"
}

/**
 * One API call per question.
 * Network/HTTP failures → UNKNOWN (not NO — we cannot assert absence of risk
 * just because the API call failed).
 */
async function askQuestion(question: string, apiKey: string): Promise<Signal> {
  let response: Response

  try {
    response = await fetch(HEURIST_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        agent_id: EXA_AGENT,
        input: {
          tool: "exa_answer_question",
          tool_arguments: { question },
          raw_data_only: false,
        },
      }),
    })
  } catch {
    return "UNKNOWN"
  }

  if (!response.ok) return "UNKNOWN"

  const data = await safeParseResponse(response)
  if (!data) return "UNKNOWN"

  const answer = extractAnswerText(data)
  if (!answer) return "UNKNOWN"

  return parseSignal(answer)
}

// ─────────────────────────────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
    }

    const { projectName } = body as Record<string, unknown>
    if (!projectName || typeof projectName !== "string" || !projectName.trim()) {
      return NextResponse.json({ error: "Missing projectName" }, { status: 400 })
    }

    const apiKey = process.env.HEURIST_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "Missing HEURIST_API_KEY" }, { status: 500 })
    }

    const trimmedName = projectName.trim()

    // YES → strong signal → full tier weight in contract
    // UNKNOWN → weak signal → half weight in contract
    // NO → discarded here, never sent to contract
    const yes: Partial<Record<TierKey, string[]>> = {}
    const unknown: Partial<Record<TierKey, string[]>> = {}

    for (const q of QUESTIONS) {
      const signal = await askQuestion(q.question(trimmedName), apiKey)

      if (signal === "YES") {
        if (!yes[q.tier]) yes[q.tier] = []
        yes[q.tier]!.push(q.label)
      } else if (signal === "UNKNOWN") {
        if (!unknown[q.tier]) unknown[q.tier] = []
        unknown[q.tier]!.push(q.label)
      }
    }

    return NextResponse.json({
      projectName: trimmedName,
      claims: { yes, unknown },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown pipeline error"
    console.error("[analyze] pipeline error:", message)
    return NextResponse.json(
      { error: "Pipeline failed", message },
      { status: 500 }
    )
  }
}