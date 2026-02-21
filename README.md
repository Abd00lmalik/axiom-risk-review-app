# Axiom Risk Review

**Decentralized risk intelligence for crypto projects, powered by AI research and on-chain validator consensus.**

Axiom is a production dApp that surfaces publicly available risk signals about blockchain projects, validates them through a decentralized network of validators, and computes a final risk score on-chain. The Intelligent Contract is the source of truth — not the AI.

---

## How It Works

### 1. AI Research (Heurist Mesh)
When a user submits a project name, the system queries [Heurist Mesh](https://mesh.heurist.ai) using the `ExaSearchAgent`. The agent searches public sources and answers a structured set of tiered risk questions, returning one of three signals per question:

- **YES** — public evidence supports the risk claim
- **NO** — public evidence contradicts the claim (discarded, not sent on-chain)
- **UNKNOWN** — insufficient public information to determine

Only `YES` and `UNKNOWN` signals proceed to the contract.

### 2. Tiered Classification

Questions are organized into four tiers by severity:

| Tier | Weight | Focus |
|------|--------|-------|
| 🔴 Existential | 5× | Anonymous founders, audit misrepresentation, security warnings |
| 🟠 Structural | 3× | Token utility, economic model sustainability |
| 🟡 Operational | 2× | Development activity, documentation quality |
| 🔵 Contextual | 1× | Launch stage, audit coverage, ecosystem maturity |

### 3. On-Chain Validation (GenLayer Intelligent Contract)
The user signs a transaction submitting their `YES` and `UNKNOWN` claim sets to an [Intelligent Contract](https://www.genlayer.com) deployed on GenLayer Studionet. A network of validators independently re-evaluates each claim against public information using non-deterministic execution with equivalence consensus.

Validation outcomes per claim:

- `YES` → validated `TRUE` → confirmed red flag (full tier weight)
- `YES` → validated `FALSE` → removed
- `UNKNOWN` → validated `CONFIRMED` → promoted to full red flag
- `UNKNOWN` → validated `REJECTED` → removed
- `UNKNOWN` → remains `UNKNOWN` → kept at 1 point (residual signal)

### 4. Risk Scoring
The contract computes a final score from all surviving flags:

| Score | Risk Level |
|-------|-----------|
| ≥ 20  | 🔴 HIGH   |
| ≥ 8   | 🟠 MEDIUM |
| < 8   | 🟢 LOW    |

Maximum theoretical score: **39** (all existential + structural + operational + contextual flags confirmed).

The contract returns: `project_name`, `overall_risk`, `total_score`, `max_score`, and a structured `flags` map organized by tier. The frontend reads this directly from the contract.

---

## Architecture

```
User Input
    │
    ▼
Heurist Mesh (ExaSearchAgent)
    │  exa_answer_question × 13 questions
    │  Returns: YES / NO / UNKNOWN per question
    │
    ▼
API Route (/api/analyze)
    │  Filters: YES + UNKNOWN only → claims payload
    │
    ▼
User Signs Transaction (MetaMask → GenLayer Studionet)
    │
    ▼
Intelligent Contract: submit_claims()
    │  Validators re-evaluate each claim independently
    │  Equivalence consensus determines final outcome
    │
    ▼
Intelligent Contract: get_latest_report()
    │  Returns validated red flags + risk level + score
    │
    ▼
Frontend (RiskReport)
    Displays tier breakdown, confirmed flags, overall risk
```

---

## Tech Stack

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Framer Motion
- **AI Research:** [Heurist Mesh](https://mesh.heurist.ai) — `ExaSearchAgent` / `exa_answer_question`
- **On-Chain Validation:** [GenLayer](https://www.genlayer.com) Intelligent Contract (Python)
- **Wallet:** MetaMask — GenLayer Studionet (Chain ID: 61999)
- **Deployment:** Vercel

---

## Environment Variables

This project requires the following environment variable to be set in your deployment platform:

```
HEURIST_API_KEY=your_heurist_api_key
```

Never commit this value. It must be set as a server-side environment variable in your deployment platform and will never be exposed to the browser.

---

## Disclaimer

Axiom Risk Review is an experimental informational tool. All outputs are derived from publicly available sources using AI-assisted research and decentralized validator consensus.

**Nothing produced by this tool constitutes financial advice, investment recommendations, legal counsel, or a security audit.** Results may be inaccurate, incomplete, or outdated. Signals marked UNKNOWN reflect insufficient public information and should not be interpreted as confirmation or denial of any claim.

We make no representations or warranties regarding the accuracy or completeness of any output. To the maximum extent permitted by applicable law, Axiom and its contributors disclaim all liability for any damages arising from use of or reliance on this tool.

Use at your own risk.

---

## License

MIT