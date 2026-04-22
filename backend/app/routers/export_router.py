from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from io import BytesIO
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_admin
from app.models.user import User
from app.services import export_service

router = APIRouter()


@router.get("/excel")
def export_excel(
    search: Optional[str] = Query(None),
    department_id: Optional[int] = Query(None),
    role_type: Optional[str] = Query(None),
    risk_level: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Export filtered ROPA records as Excel. Defaults to approved records only."""
    file_bytes = export_service.export_excel(
        db, current_user.id,
        search=search,
        department_id=department_id,
        role_type=role_type,
        risk_level=risk_level,
        status=status,
    )

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"ROPA_Export_{timestamp}.xlsx"

    return StreamingResponse(
        BytesIO(file_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
