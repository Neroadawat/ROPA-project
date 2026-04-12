from datetime import datetime

from fastapi import APIRouter, Depends
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
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Export all ROPA records as an Excel file with Controller and Processor sheets."""
    file_bytes = export_service.export_excel(db, current_user.id)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"ROPA_Export_{timestamp}.xlsx"

    return StreamingResponse(
        BytesIO(file_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
