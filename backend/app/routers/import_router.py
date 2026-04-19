from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_admin
from app.models.user import User
from app.schemas.import_export import ImportBatchResponse, ImportPreviewResponse
from app.services import import_service

router = APIRouter()


@router.post("/preview", response_model=ImportPreviewResponse)
async def import_preview(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Upload an Excel file and return a preview with valid rows and errors."""
    if not file.filename or not file.filename.endswith(".xlsx"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="รองรับเฉพาะไฟล์ .xlsx",
        )

    content = await file.read()
    try:
        preview = import_service.preview_import(db, content)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"ไม่สามารถอ่านไฟล์ Excel ได้: {str(e)}",
        )
    return preview


@router.post("/confirm", response_model=ImportBatchResponse)
async def import_confirm(
    file: UploadFile = File(...),
    department_id: int = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Re-upload the same file to confirm import. Only valid rows are imported.
    
    Args:
        file: Excel file to import
        department_id: Optional department to assign to imported records (auto-inferred if not provided)
        db: Database session
        current_user: Current authenticated user (must be admin)
    """
    if not file.filename or not file.filename.endswith(".xlsx"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="รองรับเฉพาะไฟล์ .xlsx",
        )

    content = await file.read()
    try:
        batch = import_service.confirm_import(
            db,
            content,
            file.filename,
            current_user.id,
            target_department_id=department_id,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"ไม่สามารถนำเข้าข้อมูลได้: {str(e)}",
        )
    return ImportBatchResponse.model_validate(batch)


@router.get("/batches", response_model=dict)
def list_import_batches(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """List import batch history."""
    result = import_service.list_import_batches(db, page=page, per_page=per_page)
    result["items"] = [ImportBatchResponse.model_validate(b) for b in result["items"]]
    return result
