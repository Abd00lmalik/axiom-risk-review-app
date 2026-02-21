# v5.0.0
# { "Depends": "py-genlayer:test" }

from genlayer import *
from dataclasses import dataclass
import json


# ─────────────────────────────────────────────────────────────────────────────
# Storage types
#
# source values:
#   "CONFIRMED"   — validated as TRUE (full weight)
#   "UNCONFIRMED" — re-evaluated UNKNOWN remained uncertain (half weight)
# ─────────────────────────────────────────────────────────────────────────────

@allow_storage
@dataclass
class VerifiedFlag:
    tier: str
    label: str
    source: str  # "CONFIRMED" | "UNCONFIRMED"


@allow_storage
@dataclass
class VerifiedReport:
    project_name: str
    overall_risk: str
    total_score: u32
    max_score: u32
    flags: DynArray[VerifiedFlag]


# ─────────────────────────────────────────────────────────────────────────────
# Contract
# ─────────────────────────────────────────────────────────────────────────────

class RiskReview(gl.Contract):

    reports: TreeMap[str, VerifiedReport]

    def __init__(self):
        self.reports = TreeMap[str, VerifiedReport]()

    # ── Tier weight — method instead of class dict (safer in GenLayer) ────────

    def _tier_weight(self, tier: str) -> u32:
        if tier == "existential":
            return u32(5)
        if tier == "structural":
            return u32(3)
        if tier == "operational":
            return u32(2)
        return u32(1)  # contextual and any unrecognized tier

    # ── Validate a YES claim ──────────────────────────────────────────────────
    # Returns True if the claim is supported by public evidence, False otherwise.

    def _validate_yes_claim(self, project_name: str, label: str) -> bool:

        def prompt():
            return (
                f"You are a decentralized validator with access to public information.\n\n"
                f"Project: {project_name}\n\n"
                f"Claim: \"{label}\"\n\n"
                f"Is this claim factually supported by publicly available information "
                f"about this crypto or blockchain project?\n\n"
                f"Return ONLY one word: TRUE or FALSE"
            )

        result = gl.eq_principle.prompt_non_comparative(
            prompt,
            task="Validate a crypto project risk claim",
            criteria="Return exactly TRUE or FALSE with no other text",
        )

        return result.strip().upper().startswith("TRUE")

    # ── Validate an UNKNOWN claim ─────────────────────────────────────────────
    # Returns:
    #   "CONFIRMED"   — now verifiable as TRUE (promote to full red flag)
    #   "REJECTED"    — verifiable as FALSE (remove)
    #   "UNKNOWN"     — genuinely insufficient public data (keep, lighter weight)

    def _validate_unknown_claim(self, project_name: str, label: str) -> str:

        def prompt():
            return (
                f"You are a decentralized validator with access to public information.\n\n"
                f"Project: {project_name}\n\n"
                f"Claim: \"{label}\"\n\n"
                f"This claim was previously marked UNKNOWN due to insufficient public evidence.\n\n"
                f"Re-evaluate now:\n"
                f"- If you find clear public evidence the claim is TRUE → return CONFIRMED\n"
                f"- If you find clear public evidence the claim is FALSE → return REJECTED\n"
                f"- If public information remains genuinely insufficient → return UNKNOWN\n\n"
                f"Return ONLY one word: CONFIRMED, REJECTED, or UNKNOWN"
            )

        result = gl.eq_principle.prompt_non_comparative(
            prompt,
            task="Re-validate an unknown crypto project risk claim",
            criteria="Return exactly CONFIRMED, REJECTED, or UNKNOWN with no other text",
        )

        r = result.strip().upper()
        if r.startswith("CONFIRMED"):
            return "CONFIRMED"
        if r.startswith("REJECTED"):
            return "REJECTED"
        return "UNKNOWN"

    # ── Write ─────────────────────────────────────────────────────────────────

    @gl.public.write
    def submit_claims(
        self,
        project_name: str,
        yes_json: str,
        unknown_json: str,
    ) -> str:
        """
        Accepts two claim maps from the off-chain proposer:

          yes_json:     { tier: [label, ...] }  — proposer said YES
          unknown_json: { tier: [label, ...] }  — proposer said UNKNOWN

        Validates each claim independently.
        Stores a VerifiedReport with confirmed red flags and computes risk score.
        """

        yes_claims: dict = json.loads(yes_json)
        unknown_claims: dict = json.loads(unknown_json)

        verified_flags: list = []
        total_score = u32(0)

        # ── Process YES claims ────────────────────────────────────────────────
        for tier, labels in yes_claims.items():
            weight = self._tier_weight(tier)
            for label in labels:
                is_valid = self._validate_yes_claim(project_name, label)
                if is_valid:
                    verified_flags.append(
                        VerifiedFlag(tier=tier, label=label, source="CONFIRMED")
                    )
                    total_score = total_score + weight

        # ── Process UNKNOWN claims ────────────────────────────────────────────
        for tier, labels in unknown_claims.items():
            weight = self._tier_weight(tier)
            for label in labels:
                outcome = self._validate_unknown_claim(project_name, label)
                if outcome == "CONFIRMED":
                    # Now fully verified — treat same as a YES
                    verified_flags.append(
                        VerifiedFlag(tier=tier, label=label, source="CONFIRMED")
                    )
                    total_score = total_score + weight
                elif outcome == "UNKNOWN":
                    # Genuinely unresolvable — keep as lighter signal
                    # Weight: 1 point regardless of tier (minimum signal, not full noise)
                    verified_flags.append(
                        VerifiedFlag(tier=tier, label=label, source="UNCONFIRMED")
                    )
                    total_score = total_score + u32(1)
                # REJECTED → drop, do not store

        # ── Scoring thresholds ────────────────────────────────────────────────
        # Max theoretical score (all 13 questions as YES, worst tiers):
        #   existential: 5×5 = 25
        #   structural:  3×2 =  6
        #   operational: 2×2 =  4
        #   contextual:  1×4 =  4
        #   total max  = 39
        #
        # Thresholds calibrated for this max:
        #   HIGH   ≥ 20 (majority of high-weight tiers confirmed)
        #   MEDIUM ≥ 8  (some structural/existential flags)
        #   LOW    <  8
        max_score = u32(39)

        if total_score >= u32(20):
            risk = "HIGH"
        elif total_score >= u32(8):
            risk = "MEDIUM"
        else:
            risk = "LOW"

        report = VerifiedReport(
            project_name=project_name,
            overall_risk=risk,
            total_score=total_score,
            max_score=max_score,
            flags=verified_flags,
        )

        self.reports[project_name] = report

        return "VALIDATED"

    # ── Read ──────────────────────────────────────────────────────────────────

    @gl.public.view
    def get_latest_report(self, project_name: str) -> dict:
        """
        Returns the validated report for a project.

        Shape:
          {
            "project_name": str,
            "overall_risk": "LOW" | "MEDIUM" | "HIGH",
            "total_score": int,
            "max_score": int,
            "flags": {
              tier: [{ "label": str, "source": "CONFIRMED" | "UNCONFIRMED" }]
            }
          }

        Returns {} if no report exists for this project.
        """

        report = self.reports.get(project_name)

        if report is None:
            return {}

        # Group flags by tier, preserving source metadata for the frontend
        structured: dict = {}
        for flag in report.flags:
            if flag.tier not in structured:
                structured[flag.tier] = []
            structured[flag.tier].append(
                {"label": flag.label, "source": flag.source}
            )

        return {
            "project_name": report.project_name,
            "overall_risk": report.overall_risk,
            "total_score": report.total_score,
            "max_score": report.max_score,
            "flags": structured,
        }