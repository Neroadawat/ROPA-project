from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_admin
from app.models.user import User
from app.models.user_session_log import UserSessionLog
from app.schemas.user_session_log import UserSessionLogResponse

router = APIRouter()


@router.get("", response_model=dict)
def list_user_session_logs(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    user_id: Optional[int] = None,
    action: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    query = db.query(UserSessionLog)
    if user_id:
        query = query.filter(UserSessionLog.user_id == user_id)
    if action:
        query = query.filter(UserSessionLog.action == action)
    if date_from:
        query = query.filter(UserSessionLog.created_at >= date_from)
    if date_to:
        query = query.filter(UserSessionLog.created_at <= date_to)

    total = query.count()
    items = query.order_by(UserSessionLog.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()

    return {
        "items": [UserSessionLogResponse.model_validate(i) for i in items],
        "total": total,
        "page": page,
        "per_page": per_page,
    }
