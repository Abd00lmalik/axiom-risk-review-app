# v5.1.0
# { "Depends": "py-genlayer:test" }

from genlayer import *
from dataclasses import dataclass
import json


# ─────────────────────────────────────────────────────────────────────────────
# Storage types
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
#
# Scoring model (must stay in sync with lib/preview-score.ts):
#
#   YES weights (confirmed by validators):
#     Tier 1 existential : 7 pts
#     Tier 2 structural  : 3 pts
#     Tier 3 operational : 2 pts
#     Tier 4 contextual  : 1 pt
#
#   UNKNOWN weights (unresolved after re-validation):
#     Tier 1 existential : 4 pts  ← ceil(7/2), NOT flat 1
#     Tier 2 structural  : 2 pts  ← ceil(3/2)
#     Tier 3 operational : 1 pt   ← ceil(2/2)
#     Tier 4 contextual  : 1 pt   ← min 1
#
#   Max possible score (all 16 questions YES):
#     6×7 + 3×3 + 3×2 + 4×1 = 42 + 9 + 6 + 4 = 61
#
#   Thresholds:
#     HIGH   ≥ 30  (~49% of max)
#     MEDIUM ≥ 12  (~20% of max)
#     LOW    < 12
# ─────────────────────────────────────────────────────────────────────────────

class RiskReview(gl.Contract):

    reports: TreeMap[str, VerifiedReport]

    def __init__(self):
        self.reports = TreeMap[str, VerifiedReport]()

    # ── Tier weights ──────────────────────────────────────────────────────────

    def _yes_weight(self, tier: str) -> u32:
        if tier == "existential":
            return u32(7)
        if tier == "structural":
            return u32(3)
        if tier == "operational":
            return u32(2)
        return u32(1)  # contextual

    def _unknown_weight(self, tier: str) -> u32:
        """
        UNKNOWN signals use half the YES weight (ceiling division).
        This preserves tier importance for unresolved signals rather than
        collapsing all uncertainty to a flat 1 point regardless of severity.
        """
        if tier == "existential":
            return u32(4)  # ceil(7/2)
        if tier == "structural":
            return u32(2)  # ceil(3/2)
        return u32(1)      # operational ceil(2/2)=1, contextual min=1

    # ── Validate a YES claim ──────────────────────────────────────────────────

    def _validate_yes_claim(self, project_name: str, label: str) -> bool:

        def prompt():
            return (
                f"You are a decentralized validator with access to public information.\n\n"
                f"Project: {project_name}\n\n"
                f"Claim: \"{label}\"\n\n"
                f"Is this claim factually supported by publicly available information "
                f"about this crypto or blockchain project?\n\n"
                f"Important: For claims about absence of something (e.g. no audits, "
                f"anonymous team, no governance), if that thing genuinely cannot be "
                f"found in public sources, the claim IS supported.\n\n"
                f"Return ONLY one word: TRUE or FALSE"
            )

        result = gl.eq_principle.prompt_non_comparative(
            prompt,
            task="Validate a crypto project risk claim",
            criteria="Return exactly TRUE or FALSE with no other text",
        )

        return result.strip().upper().startswith("TRUE")

    # ── Re-validate an UNKNOWN claim ──────────────────────────────────────────

    def _validate_unknown_claim(self, project_name: str, label: str) -> str:

        def prompt():
            return (
                f"You are a decentralized validator with access to public information.\n\n"
                f"Project: {project_name}\n\n"
                f"Claim: \"{label}\"\n\n"
                f"This claim was previously marked UNKNOWN due to insufficient public "
                f"evidence. Re-evaluate now with fresh research.\n\n"
                f"Important: For claims about absence of something (e.g. no audits, "
                f"anonymous team, no governance docs), if that thing genuinely cannot "
                f"be found in public sources, the claim should be CONFIRMED.\n\n"
                f"- Clear public evidence the claim is TRUE → CONFIRMED\n"
                f"- Clear public evidence the claim is FALSE → REJECTED\n"
                f"- Genuinely insufficient public information remains → UNKNOWN\n\n"
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

        yes_claims: dict = json.loads(yes_json)
        unknown_claims: dict = json.loads(unknown_json)

        verified_flags: list = []
        total_score = u32(0)

        # ── YES claims — validate, apply full tier weight ─────────────────────
        for tier, labels in yes_claims.items():
            weight = self._yes_weight(tier)
            for label in labels:
                if self._validate_yes_claim(project_name, label):
                    verified_flags.append(
                        VerifiedFlag(tier=tier, label=label, source="CONFIRMED")
                    )
                    total_score = total_score + weight

        # ── UNKNOWN claims — re-evaluate, apply tier-weighted UNKNOWN score ───
        for tier, labels in unknown_claims.items():
            yes_weight     = self._yes_weight(tier)
            unknown_weight = self._unknown_weight(tier)

            for label in labels:
                outcome = self._validate_unknown_claim(project_name, label)

                if outcome == "CONFIRMED":
                    # Now fully verified — treat same as YES
                    verified_flags.append(
                        VerifiedFlag(tier=tier, label=label, source="CONFIRMED")
                    )
                    total_score = total_score + yes_weight

                elif outcome == "UNKNOWN":
                    # Still unresolvable — keep at tier-weighted UNKNOWN score
                    # NOT flat 1pt — tier severity still matters for uncertainty
                    verified_flags.append(
                        VerifiedFlag(tier=tier, label=label, source="UNCONFIRMED")
                    )
                    total_score = total_score + unknown_weight

                # REJECTED → drop entirely, no score, not stored

        # ── Scoring thresholds ────────────────────────────────────────────────
        # Max score (16 questions, all YES):
        # 6×7 + 3×3 + 3×2 + 4×1 = 42 + 9 + 6 + 4 = 61
        max_score = u32(61)

        if total_score >= u32(30):
            risk = "HIGH"
        elif total_score >= u32(12):
            risk = "MEDIUM"
        else:
            risk = "LOW"

        self.reports[project_name] = VerifiedReport(
            project_name=project_name,
            overall_risk=risk,
            total_score=total_score,
            max_score=max_score,
            flags=verified_flags,
        )

        return "VALIDATED"

    # ── Read ──────────────────────────────────────────────────────────────────

    @gl.public.view
    def get_latest_report(self, project_name: str) -> dict:

        report = self.reports.get(project_name)
        if report is None:
            return {}

        structured: dict = {}
        for flag in report.flags:
            if flag.tier not in structured:
                structured[flag.tier] = []
            structured[flag.tier].append(
                {"label": flag.label, "source": flag.source}
            )

        return {
            "project_name":  report.project_name,
            "overall_risk":  report.overall_risk,
            "total_score":   report.total_score,
            "max_score":     report.max_score,
            "flags":         structured,
        }