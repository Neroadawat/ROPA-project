"""ROPA Records router — CRUD, approval workflow, version history, retention alerts."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, require_dpo
from app.models.user import User
from app.schemas.ropa_record import (
    ApproveRequest,
    DeleteRequest,
    PaginatedRopaRecordList,
    RecordVersionResponse,
    RejectRequest,
    RopaRecordCreate,
    RopaRecordListResponse,
    RopaRecordResponse,
    RopaRecordUpdate,
    VersionCompareResponse,
)
from app.services import ropa_service

router = APIRouter()


# ---------------------------------------------------------------------------
# Retention Alerts (placed before /{id} to avoid path conflict)
# ---------------------------------------------------------------------------

@router.get("/retention-alerts")
def get_retention_alerts(
    urgency: str | None = Query(None, description="Comma-separated: overdue,within_30,within_60_90,review_overdue"),
    department_id: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ropa_service.get_retention_alerts(db, current_user, urgency=urgency, department_id=department_id)


# ---------------------------------------------------------------------------
# Approval Workflow
# ---------------------------------------------------------------------------

@router.get("/pending", response_model=PaginatedRopaRecordList)
def list_pending_records(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_dpo),
):
    result = ropa_service.list_pending_records(db, page=page, per_page=per_page)
    result["items"] = [RopaRecordListResponse.model_validate(r) for r in result["items"]]
    return result


@router.post("/{record_id}/approve", response_model=RopaRecordResponse)
def approve_record(
    record_id: int,
    body: ApproveRequest = ApproveRequest(),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_dpo),
):
    record = ropa_service.approve_ropa_record(db, record_id, current_user)
    return RopaRecordResponse.model_validate(record)


@router.post("/{record_id}/reject", response_model=RopaRecordResponse)
def reject_record(
    record_id: int,
    body: RejectRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_dpo),
):
    record = ropa_service.reject_ropa_record(db, record_id, body.rejection_reason, current_user)
    return RopaRecordResponse.model_validate(record)


# ---------------------------------------------------------------------------
# Version History
# ---------------------------------------------------------------------------

@router.get("/{record_id}/versions")
def list_versions(
    record_id: int,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = ropa_service.list_record_versions(db, record_id, current_user, page=page, per_page=per_page)
    result["items"] = [RecordVersionResponse.model_validate(v) for v in result["items"]]
    return result


@router.get("/{record_id}/versions/compare", response_model=VersionCompareResponse)
def compare_versions(
    record_id: int,
    version_id_1: int = Query(..., description="First version ID"),
    version_id_2: int = Query(..., description="Second version ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ropa_service.compare_record_versions(db, record_id, version_id_1, version_id_2, current_user)


@router.get("/{record_id}/versions/{version_id}", response_model=RecordVersionResponse)
def get_version(
    record_id: int,
    version_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    version = ropa_service.get_record_version(db, record_id, version_id, current_user)
    return RecordVersionResponse.model_validate(version)


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------

@router.get("", response_model=PaginatedRopaRecordList)
def list_ropa_records(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: str | None = Query(None),
    department_id: int | None = Query(None),
    role_type: str | None = Query(None),
    risk_level: str | None = Query(None),
    legal_basis: str | None = Query(None),
    status: str | None = Query(None, alias="status"),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = ropa_service.list_ropa_records(
        db, current_user,
        page=page, per_page=per_page, search=search,
        department_id=department_id, role_type=role_type,
        risk_level=risk_level, legal_basis=legal_basis,
        record_status=status, sort_by=sort_by, sort_order=sort_order,
    )
    result["items"] = [RopaRecordListResponse.model_validate(r) for r in result["items"]]
    return result


@router.post("", response_model=RopaRecordResponse, status_code=201)
def create_ropa_record(
    body: RopaRecordCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Viewer_Auditor cannot create
    if current_user.role == "Viewer_Auditor":
        raise HTTPException(status_code=403, detail="Viewer/Auditor ไม่มีสิทธิ์สร้าง ROPA Record")
    record = ropa_service.create_ropa_record(db, body, current_user)
    return RopaRecordResponse.model_validate(record)


@router.get("/{record_id}", response_model=RopaRecordResponse)
def get_ropa_record(
    record_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = ropa_service.get_ropa_record(db, record_id, current_user)
    return RopaRecordResponse.model_validate(record)


@router.put("/{record_id}", response_model=RopaRecordResponse)
def update_ropa_record(
    record_id: int,
    body: RopaRecordUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Viewer_Auditor cannot update
    if current_user.role == "Viewer_Auditor":
        raise HTTPException(status_code=403, detail="Viewer/Auditor ไม่มีสิทธิ์แก้ไข ROPA Record")
    record = ropa_service.update_ropa_record(db, record_id, body, current_user)
    return RopaRecordResponse.model_validate(record)


@router.delete("/{record_id}", response_model=RopaRecordResponse)
def delete_ropa_record(
    record_id: int,
    body: DeleteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Viewer_Auditor cannot delete
    if current_user.role == "Viewer_Auditor":
        raise HTTPException(status_code=403, detail="Viewer/Auditor ไม่มีสิทธิ์ลบ ROPA Record")
    record = ropa_service.delete_ropa_record(db, record_id, body.reason, current_user)
    return RopaRecordResponse.model_validate(record)
