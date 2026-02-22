import { NextRequest, NextResponse } from "next/server"

const HEURIST_API_URL = "https://mesh.heurist.xyz/mesh_request"
const EXA_AGENT = "ExaSearchAgent"

// Max concurrent Heurist requests — avoids rate limiting while still
// running questions in parallel instead of sequentially
const CONCURRENCY_LIMIT = 4

type TierKey = "existential" | "structural" | "operational" | "contextual"
type Signal = "YES" | "NO" | "UNKNOWN"

interface TierQuestion {
  tier: TierKey
  label: string
  question: (project: string) => string
}

// ─────────────────────────────────────────────────────────────────────────────
// Question design principles
//
// Two categories of question require different default logic:
//
// ABSENCE-BASED — the risk IS the inability to find something.
//   "Can you find real founder identities?" — if NO → the claim is YES.
//   Prompt pattern: "If you CANNOT find X, answer YES."
//   These should NEVER default to UNKNOWN when public info is just thin.
//
// PRESENCE-BASED — requires positive evidence of the bad thing.
//   "Are there published security warnings?" — needs actual evidence.
//   Prompt pattern: "Answer YES only if you find explicit evidence."
//   These CAN default to UNKNOWN if evidence is genuinely absent.
//
// Tagging each question below so the logic is auditable.
// ─────────────────────────────────────────────────────────────────────────────

const QUESTIONS: TierQuestion[] = [

  // ── TIER 1: EXISTENTIAL — weight 7 per YES, 4 per UNKNOWN ────────────────

  {
    // ABSENCE-BASED — can't find identity = the risk
    tier: "existential",
    label: "Anonymous or unverifiable founders",
    question: (p) => `Research the blockchain/crypto project "${p}".

Your task: determine whether the founders or core team members have verifiable real-world identities.

Search for: full real names, LinkedIn profiles, GitHub profiles linked to real identities, conference speaker bios, previous employment at named companies, or any credible public record of who the team actually is.

Critical rule: If you CANNOT find verified real-world identities for the core founding team, answer YES. The inability to verify is itself the risk signal. A pseudonymous team with no confirmable identities is anonymous by definition.

Answer YES if the team is anonymous, pseudonymous, or their identities cannot be confirmed from public sources.
Answer NO only if you find clear, verifiable real-world identities for at least the key founders.
Answer UNKNOWN only if the project is so new or obscure that no information about the team exists at all.

Last line, one word only: YES, NO, or UNKNOWN.`,
  },

  {
    // ABSENCE-BASED — can't find governance docs = the risk
    tier: "existential",
    label: "No clear ownership or governance structure",
    question: (p) => `Research the blockchain/crypto project "${p}".

Your task: determine whether the project has a publicly documented governance or ownership structure.

Search for: DAO governance documentation, on-chain governance contracts, published multisig arrangements, formal governance proposals, voting mechanisms, or any public record of how decisions are made and who controls the protocol.

Critical rule: If you CANNOT find any documented governance or ownership structure, answer YES.

Answer YES if no governance or ownership structure can be found in public sources.
Answer NO if you find clear published documentation of how the protocol is governed or owned.
Answer UNKNOWN only if governance exists but is too ambiguous to classify.

Last line, one word only: YES, NO, or UNKNOWN.`,
  },

  {
    // PRESENCE-BASED — needs positive evidence of fabrication
    tier: "existential",
    label: "Misrepresentation of audits or partnerships",
    question: (p) => `Research the blockchain/crypto project "${p}".

Your task: determine whether this project has publicly misrepresented, fabricated, or exaggerated its security audits or partnerships.

Search for: claims of audits that cannot be verified, partnerships that the named partner has denied, audit reports that don't exist at the linked URL, or any public controversy about false partnership announcements.

Answer YES if you find explicit public evidence of misrepresentation or fabrication.
Answer NO if audit and partnership claims appear verifiable and accurate.
Answer UNKNOWN if you cannot find enough information to determine this either way.

Last line, one word only: YES, NO, or UNKNOWN.`,
  },

  {
    // PRESENCE-BASED — needs evidence of centralized dependency
    tier: "existential",
    label: "Critical dependency on single off-chain service with no fallback",
    question: (p) => `Research the blockchain/crypto project "${p}".

Your task: determine whether the protocol has a critical dependency on a single centralized off-chain service with no documented fallback.

Search for: oracle providers with no redundancy, single RPC endpoints the protocol requires, centralized price feeds, admin keys with no timelock, or any single point of failure in the protocol's off-chain infrastructure.

Answer YES if you find evidence of a critical single-point dependency with no fallback mechanism documented.
Answer NO if the protocol has documented redundancy or decentralized alternatives for its critical services.
Answer UNKNOWN if insufficient technical documentation exists to determine this.

Last line, one word only: YES, NO, or UNKNOWN.`,
  },

  {
    // PRESENCE-BASED — needs actual published warnings
    tier: "existential",
    label: "Explicit warnings from reputable security researchers or auditors",
    question: (p) => `Research the blockchain/crypto project "${p}".

Your task: determine whether reputable security researchers or audit firms have issued explicit public warnings about this project.

Search for: published audit reports with critical or high severity findings, public statements from security firms (Trail of Bits, OpenZeppelin, Certik, Peckshield, Halborn, etc.), warnings from on-chain analytics platforms (Chainalysis, Elliptic), or public disclosures from independent security researchers.

Answer YES if you find explicit published warnings or critical findings from credible security sources.
Answer NO if major audits show no critical findings and no public warnings exist.
Answer UNKNOWN if the project has not been audited and no security researchers have publicly commented.

Last line, one word only: YES, NO, or UNKNOWN.`,
  },

  {
    // ABSENCE-BASED — unverifiable allegations count
    tier: "existential",
    label: "Public allegations of fraud, exit scam, or misconduct",
    question: (p) => `Research the blockchain/crypto project "${p}".

Your task: determine whether there are credible public allegations of fraud, rug pull, exit scam, or serious misconduct against this project or its team.

Search for: community reports of rug pulls, credible journalism about fraud allegations, legal actions or regulatory notices, social media threads from credible researchers documenting misconduct, or on-chain evidence of suspicious fund movements reported publicly.

Answer YES if credible public allegations or confirmed misconduct exist.
Answer NO if the project has a clean public record with no fraud allegations.
Answer UNKNOWN if minor or unverifiable complaints exist but nothing credible or substantial.

Last line, one word only: YES, NO, or UNKNOWN.`,
  },

  // ── TIER 2: STRUCTURAL — weight 3 per YES, 2 per UNKNOWN ─────────────────

  {
    // ABSENCE-BASED — can't find utility = the risk
    tier: "structural",
    label: "No clear token utility beyond speculation",
    question: (p) => `Research the blockchain/crypto project "${p}".

Your task: determine whether the project's token has a documented technical function within the protocol, or whether it exists primarily for speculation.

Search for: published tokenomics documents, whitepaper sections describing token utility, on-chain mechanisms that require the token to function (staking for security, governance weight, fee payment, collateral, etc.).

Critical rule: If the token's only described use cases are "governance" without meaningful governance power, or "staking for rewards" funded by inflation, these do not constitute genuine technical utility.

Answer YES if the token lacks meaningful technical utility within the protocol.
Answer NO if the token is genuinely required for protocol function.
Answer UNKNOWN if tokenomics documentation is too sparse to determine.

Last line, one word only: YES, NO, or UNKNOWN.`,
  },

  {
    // PRESENCE-BASED — needs evidence of Ponzi-like structure
    tier: "structural",
    label: "Economic model depends on constant new capital inflow",
    question: (p) => `Research the blockchain/crypto project "${p}".

Your task: determine whether the project's advertised yields or economic model require continuous new investor capital to sustain, rather than being funded by genuine protocol revenue.

Search for: yield sources in published documentation, whether advertised APY/APR is funded by token inflation rather than real revenue, whether the model breaks down without new deposits, or any analysis from credible DeFi researchers about the sustainability of the economic model.

Answer YES if the economic model appears to depend on continuous new capital rather than genuine revenue.
Answer NO if yields are clearly funded by verifiable protocol revenue or fees.
Answer UNKNOWN if insufficient economic documentation exists to make this determination.

Last line, one word only: YES, NO, or UNKNOWN.`,
  },

  {
    // ABSENCE-BASED — can't find treasury info = risk
    tier: "structural",
    label: "Treasury runway or fund allocation not publicly disclosed",
    question: (p) => `Research the blockchain/crypto project "${p}".

Your task: determine whether the project publicly discloses its treasury holdings, fund allocation, or operational runway.

Search for: on-chain treasury addresses, published financial reports, token allocation documentation showing what percentage goes to team/investors/treasury, or any public disclosure of how raised funds are managed.

Critical rule: If you CANNOT find any public disclosure of treasury or fund management, answer YES.

Answer YES if treasury, runway, or fund allocation is not publicly disclosed.
Answer NO if clear public disclosure of treasury and fund management exists.
Answer UNKNOWN only if partial disclosure exists but key details are missing.

Last line, one word only: YES, NO, or UNKNOWN.`,
  },

  // ── TIER 3: OPERATIONAL — weight 2 per YES, 1 per UNKNOWN ────────────────

  {
    // PRESENCE-BASED — observable from GitHub
    tier: "operational",
    label: "Infrequent or stalled development activity",
    question: (p) => `Research the blockchain/crypto project "${p}".

Your task: determine whether the project's public development activity has been infrequent or stalled.

Search for: GitHub repository commit history, last commit dates, number of contributors, release frequency, changelog updates, or any public reports about development activity slowing.

Answer YES if GitHub shows no meaningful commits in the past 3-6 months, or if multiple credible sources report development has stalled.
Answer NO if there is consistent recent development activity with regular commits.
Answer UNKNOWN if the project has no public repository or development activity is impossible to verify.

Last line, one word only: YES, NO, or UNKNOWN.`,
  },

  {
    // ABSENCE-BASED — can't find docs = the risk
    tier: "operational",
    label: "Poor or significantly outdated documentation",
    question: (p) => `Research the blockchain/crypto project "${p}".

Your task: determine whether the project's publicly available technical documentation is poor, incomplete, or significantly outdated.

Search for: official documentation site, whitepaper recency, developer docs completeness, whether docs match the current state of the protocol, and whether key technical details are documented.

Critical rule: If documentation is missing, broken, or last updated more than 12 months ago while the protocol has changed, answer YES.

Answer YES if documentation is poor, missing, or significantly out of date.
Answer NO if documentation is comprehensive, clear, and reasonably current.
Answer UNKNOWN if you cannot find documentation to evaluate.

Last line, one word only: YES, NO, or UNKNOWN.`,
  },

  {
    // PRESENCE-BASED — observable from public communications
    tier: "operational",
    label: "No consistent community or developer communication",
    question: (p) => `Research the blockchain/crypto project "${p}".

Your task: determine whether the project maintains consistent public communication with its community and developers.

Search for: Discord/Telegram activity, Twitter/X posting frequency, blog or Medium posts, developer calls or AMAs, or any regular public-facing communication channels.

Answer YES if the project's public communication channels are inactive, abandoned, or have gone silent for several months.
Answer NO if the project maintains regular and consistent community communication.
Answer UNKNOWN if communication channels exist but activity level is unclear.

Last line, one word only: YES, NO, or UNKNOWN.`,
  },

  // ── TIER 4: CONTEXTUAL — weight 1 per YES, 1 per UNKNOWN ─────────────────

  {
    // ABSENCE-BASED — no mainnet = yes
    tier: "contextual",
    label: "Pre-mainnet or testnet only",
    question: (p) => `Research the blockchain/crypto project "${p}".

Your task: determine whether the project is currently operating only on testnet or is in a pre-mainnet state.

Search for: mainnet launch announcements, live contract addresses on mainnet, mainnet block explorer listings, or any evidence of production deployment.

Critical rule: If you CANNOT find evidence of a live mainnet deployment, answer YES.

Answer YES if the project has no confirmed live mainnet deployment.
Answer NO if you find clear evidence the project is live on mainnet.
Answer UNKNOWN only if mainnet status is genuinely ambiguous.

Last line, one word only: YES, NO, or UNKNOWN.`,
  },

  {
    // PRESENCE-BASED — needs evidence of recency
    tier: "contextual",
    label: "Recently launched (under 12 months)",
    question: (p) => `Research the blockchain/crypto project "${p}".

Your task: determine whether this project's mainnet or primary product launched within the last 12 months.

Search for: mainnet launch date announcements, earliest on-chain activity, launch blog posts, or any dated public record of when the project went live.

Answer YES if the project launched within the past 12 months.
Answer NO if the project has been live for more than 12 months.
Answer UNKNOWN if launch date cannot be determined from public sources.

Last line, one word only: YES, NO, or UNKNOWN.`,
  },

  {
    // ABSENCE-BASED — can't find audits = yes
    tier: "contextual",
    label: "No independent security audits published",
    question: (p) => `Research the blockchain/crypto project "${p}".

Your task: determine whether the project has published independent security audits from recognized firms.

Search for: published audit reports (PDF or linked documents), audit firm names and dates, security review announcements, or any public record of third-party code review.

Critical rule: If you CANNOT find any published independent audit from a credible firm, answer YES.

Answer YES if no published independent security audits can be found.
Answer NO if you find one or more published audits from recognized security firms.
Answer UNKNOWN only if audit status is genuinely unclear despite available information.

Last line, one word only: YES, NO, or UNKNOWN.`,
  },

  {
    // ABSENCE-BASED — can't find integrations = yes
    tier: "contextual",
    label: "Sparse ecosystem integrations or third-party coverage",
    question: (p) => `Research the blockchain/crypto project "${p}".

Your task: determine whether the project has meaningful ecosystem integrations and independent third-party coverage.

Search for: integrations with other protocols, listings on DeFi aggregators (DefiLlama, DeFiPulse), coverage by independent crypto journalists or researchers, partnerships confirmed by both parties, or any evidence of ecosystem adoption beyond the project's own announcements.

Critical rule: If you CANNOT find meaningful third-party coverage or integrations beyond the project's own channels, answer YES.

Answer YES if integrations and independent coverage are sparse or nonexistent.
Answer NO if the project has meaningful ecosystem integrations and credible independent coverage.
Answer UNKNOWN only if coverage exists but its quality or independence is unclear.

Last line, one word only: YES, NO, or UNKNOWN.`,
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Concurrency limiter
//
// Runs up to `limit` async tasks simultaneously.
// Preserves result order. Uses a worker pool pattern.
// ─────────────────────────────────────────────────────────────────────────────

async function withConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  limit: number
): Promise<T[]> {
  const results: T[] = new Array(tasks.length)
  let cursor = 0

  async function worker() {
    while (cursor < tasks.length) {
      const i = cursor++
      results[i] = await tasks[i]()
    }
  }

  const workers = Array.from(
    { length: Math.min(limit, tasks.length) },
    worker
  )
  await Promise.all(workers)
  return results
}

// ─────────────────────────────────────────────────────────────────────────────
// Heurist helpers
// ─────────────────────────────────────────────────────────────────────────────

async function safeParseResponse(response: Response): Promise<unknown> {
  try {
    const text = await response.text()
    if (!text || text.trim() === "") return null
    return JSON.parse(text)
  } catch {
    return null
  }
}

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

function parseSignal(raw: string): Signal {
  if (!raw) return "UNKNOWN"

  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean)
  const lastLine = lines[lines.length - 1] ?? ""
  const lastWord = lastLine.split(/\s+/).pop()?.toUpperCase().replace(/[^A-Z]/g, "") ?? ""

  if (lastWord === "YES")     return "YES"
  if (lastWord === "NO")      return "NO"
  if (lastWord === "UNKNOWN") return "UNKNOWN"

  // Fallback full-text scan — priority order matters
  const upper = raw.toUpperCase()
  if (upper.match(/\bYES\b/))     return "YES"
  if (upper.match(/\bUNKNOWN\b/)) return "UNKNOWN"
  if (upper.match(/\bNO\b/))      return "NO"

  return "UNKNOWN"
}

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

    // Run all questions in parallel (up to CONCURRENCY_LIMIT at once)
    // instead of sequentially — dramatically reduces total research time
    const tasks = QUESTIONS.map(
      (q) => () => askQuestion(q.question(trimmedName), apiKey)
    )

    const signals = await withConcurrency(tasks, CONCURRENCY_LIMIT)

    const yes:     Partial<Record<TierKey, string[]>> = {}
    const unknown: Partial<Record<TierKey, string[]>> = {}

    QUESTIONS.forEach((q, i) => {
      const signal = signals[i]
      if (signal === "YES") {
        if (!yes[q.tier]) yes[q.tier] = []
        yes[q.tier]!.push(q.label)
      } else if (signal === "UNKNOWN") {
        if (!unknown[q.tier]) unknown[q.tier] = []
        unknown[q.tier]!.push(q.label)
      }
      // NO → discarded
    })

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