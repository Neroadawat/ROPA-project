from typing import List

from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.models.ai_suggestion_log import AiSuggestionLog
from app.rules.suggestion_engine import suggest_legal_basis, SuggestionResult


def get_suggestion(
    db: Session,
    user_id: int,
    activity_name: str,
    purpose: str,
) -> SuggestionResult:
    """Run the rule engine and log the suggestion."""
    result = suggest_legal_basis(activity_name, purpose)

    # Persist log
    log = AiSuggestionLog(
        user_id=user_id,
        input_activity_name=activity_name,
        input_purpose=purpose,
        suggestions=[
            {
                "legal_basis": s.legal_basis,
                "confidence": s.confidence,
                "reasoning": s.reasoning,
                "pdpa_section": s.pdpa_section,
                "caution": s.caution,
                "matched_keywords": s.matched_keywords,
            }
            for s in result.suggestions
        ],
        engine_version=result.engine_version,
    )
    db.add(log)
    db.commit()

    return result


def list_suggestion_logs(
    db: Session,
    page: int = 1,
    per_page: int = 20,
    user_id: int | None = None,
) -> dict:
    """List suggestion logs with pagination and optional user filter."""
    query = db.query(AiSuggestionLog)

    if user_id is not None:
        query = query.filter(AiSuggestionLog.user_id == user_id)

    total = query.count()
    items = (
        query.order_by(desc(AiSuggestionLog.created_at))
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )

    return {
        "items": items,
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": (total + per_page - 1) // per_page,
    }
