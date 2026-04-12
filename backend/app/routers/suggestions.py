from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, require_admin
from app.models.user import User
from app.schemas.suggestion import (
    SuggestRequest,
    SuggestResponse,
    SuggestionItem,
    SuggestionLogResponse,
)
from app.services.suggestion_service import get_suggestion, list_suggestion_logs

router = APIRouter()


@router.post("/legal-basis", response_model=SuggestResponse)
def suggest_legal_basis(
    body: SuggestRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = get_suggestion(
        db=db,
        user_id=current_user.id,
        activity_name=body.activity_name,
        purpose=body.purpose,
    )
    return SuggestResponse(
        suggestions=[
            SuggestionItem(
                legal_basis=s.legal_basis,
                confidence=s.confidence,
                reasoning=s.reasoning,
                pdpa_section=s.pdpa_section,
                caution=s.caution,
                matched_keywords=s.matched_keywords,
            )
            for s in result.suggestions
        ],
        input_summary=result.input_summary,
        engine_version=result.engine_version,
        fallback=result.fallback,
        detail=result.detail,
    )


@router.get("/legal-basis/logs")
def get_suggestion_logs(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    user_id: Optional[int] = Query(None),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    result = list_suggestion_logs(
        db=db,
        page=page,
        per_page=per_page,
        user_id=user_id,
    )
    return {
        "items": [SuggestionLogResponse.model_validate(item) for item in result["items"]],
        "total": result["total"],
        "page": result["page"],
        "per_page": result["per_page"],
        "total_pages": result["total_pages"],
    }
