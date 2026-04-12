"""
Suggestion Engine — matches activity_name + purpose against keyword rules
and returns sorted legal basis suggestions with confidence scores.
"""

from dataclasses import dataclass, field
from typing import List, Optional

from app.rules.legal_basis_rules import LEGAL_BASIS_RULES, LegalBasisRule

ENGINE_VERSION = "rule-based-v1"


@dataclass
class Suggestion:
    legal_basis: str
    confidence: float
    reasoning: str
    pdpa_section: str
    caution: Optional[str]
    matched_keywords: List[str]


@dataclass
class SuggestionResult:
    suggestions: List[Suggestion]
    input_summary: str
    engine_version: str = ENGINE_VERSION
    fallback: bool = False
    detail: Optional[str] = None


def _normalize(text: str) -> str:
    """Lowercase and strip whitespace for matching."""
    return text.lower().strip()


def _match_rule(rule: LegalBasisRule, combined_text: str) -> Optional[Suggestion]:
    """Match a single rule against the combined input text.

    Returns a Suggestion if at least one keyword matches, otherwise None.
    Confidence = matched_keywords / total_keywords for this rule.
    """
    normalized = _normalize(combined_text)
    matched: List[str] = [kw for kw in rule.keywords if _normalize(kw) in normalized]

    if not matched:
        return None

    confidence = round(len(matched) / len(rule.keywords), 2)
    reasoning = rule.reasoning_template.format(pdpa_section=rule.pdpa_section)

    return Suggestion(
        legal_basis=rule.legal_basis,
        confidence=confidence,
        reasoning=reasoning,
        pdpa_section=rule.pdpa_section,
        caution=rule.caution,
        matched_keywords=matched,
    )


def suggest_legal_basis(activity_name: str, purpose: str) -> SuggestionResult:
    """Analyze activity_name and purpose, return sorted suggestions.

    Returns a fallback message when no keywords match any rule.
    """
    combined = f"{activity_name} {purpose}"
    input_summary = combined.strip()[:200]

    suggestions: List[Suggestion] = []
    for rule in LEGAL_BASIS_RULES:
        result = _match_rule(rule, combined)
        if result is not None:
            suggestions.append(result)

    # Sort by confidence descending
    suggestions.sort(key=lambda s: s.confidence, reverse=True)

    if not suggestions:
        return SuggestionResult(
            suggestions=[],
            input_summary=input_summary,
            fallback=True,
            detail="ไม่สามารถแนะนำได้ กรุณาเลือก Legal Basis ด้วยตนเอง",
        )

    return SuggestionResult(
        suggestions=suggestions,
        input_summary=input_summary,
    )
