"""ROPA Record service — CRUD, approval workflow helpers, version snapshots."""

from datetime import date, datetime
from math import ceil
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.models.record_version import RecordVersion
from app.models.ropa_data_subject import RopaDataSubject
from app.models.ropa_personal_data_type import RopaPersonalDataType
from app.models.ropa_record import RopaRecord
from app.models.user import User
from app.schemas.ropa_record import RopaRecordCreate, RopaRecordUpdate
from app.services.audit_service import log_action


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

_RECORD_FIELDS = [
    "department_id", "role_type", "controller_id", "processor_id",
    "process_name", "activity_name", "purpose", "risk_level",
    "data_acquisition_method", "data_source_direct", "data_source_other",
    "legal_basis_thai", "legal_basis_gdpr",
    "minor_consent_under_10", "minor_consent_10_20",
    "cross_border_transfer", "cross_border_affiliate", "cross_border_method",
    "cross_border_standard", "cross_border_exception",
    "retention_period", "retention_expiry_date", "next_review_date",
    "storage_type", "storage_method", "access_rights", "deletion_method",
    "data_owner", "third_party_recipients", "disclosure_exemption", "rights_refusal",
    "security_organizational", "security_technical", "security_physical",
    "security_access_control", "security_responsibility", "security_audit",
]


def _record_snapshot(record: RopaRecord) -> dict:
    """Build a JSON-serialisable snapshot of a ROPA record including junction data."""
    snap: dict = {}
    for f in _RECORD_FIELDS:
        val = getattr(record, f, None)
        if isinstance(val, (date, datetime)):
            val = val.isoformat()
        snap[f] = val
    snap["status"] = record.status
    snap["data_subject_category_ids"] = sorted(
        ds.id for ds in (record.data_subjects or [])
    )
    snap["personal_data_type_ids"] = sorted(
        pt.id for pt in (record.personal_data_types or [])
    )
    return snap


def _create_version(db: Session, record: RopaRecord, user_id: int, reason: Optional[str] = None) -> RecordVersion:
    """Create a new version snapshot for a ROPA record."""
    # Determine next version number
    last = (
        db.query(RecordVersion.version_number)
        .filter(RecordVersion.ropa_record_id == record.id)
        .order_by(RecordVersion.version_number.desc())
        .first()
    )
    next_num = (last[0] + 1) if last else 1

    version = RecordVersion(
        ropa_record_id=record.id,
        version_number=next_num,
        snapshot=_record_snapshot(record),
        changed_by=user_id,
        change_reason=reason,
    )
    db.add(version)
    return version


def _sync_junction(db: Session, record: RopaRecord, ds_ids: list[int], pdt_ids: list[int]) -> None:
    """Replace junction-table rows for data subjects and personal data types."""
    # Data subjects
    db.query(RopaDataSubject).filter(RopaDataSubject.ropa_record_id == record.id).delete()
    for ds_id in set(ds_ids):
        db.add(RopaDataSubject(ropa_record_id=record.id, data_subject_category_id=ds_id))

    # Personal data types
    db.query(RopaPersonalDataType).filter(RopaPersonalDataType.ropa_record_id == record.id).delete()
    for pdt_id in set(pdt_ids):
        db.add(RopaPersonalDataType(ropa_record_id=record.id, personal_data_type_id=pdt_id))


def _base_query(db: Session):
    """Return a query with eager-loaded relationships for ROPA records."""
    return (
        db.query(RopaRecord)
        .options(
            joinedload(RopaRecord.department),
            joinedload(RopaRecord.creator),
            joinedload(RopaRecord.controller),
            joinedload(RopaRecord.processor),
            joinedload(RopaRecord.approver),
            joinedload(RopaRecord.data_subjects),
            joinedload(RopaRecord.personal_data_types),
        )
    )


def _apply_dept_scope(query, user: User):
    """Auto-filter by department for Department_User role."""
    if user.role == "Department_User":
        query = query.filter(RopaRecord.department_id == user.department_id)
    return query


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------

def create_ropa_record(db: Session, data: RopaRecordCreate, user: User) -> RopaRecord:
    """Create a new ROPA record with status=pending_approval."""
    record_data = data.model_dump(exclude={"data_subject_category_ids", "personal_data_type_ids", "reason"})
    record = RopaRecord(**record_data, created_by=user.id, status="pending_approval")

    # Department_User must create in own department
    if user.role == "Department_User" and record.department_id != user.department_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="ไม่สามารถสร้าง ROPA Record ในแผนกอื่นได้")

    db.add(record)
    db.flush()  # get record.id

    _sync_junction(db, record, data.data_subject_category_ids, data.personal_data_type_ids)
    db.flush()

    # Reload relationships for snapshot
    db.refresh(record)
    _create_version(db, record, user.id, reason=data.reason)
    db.flush()

    # log_action commits the transaction
    log_action(
        db, user_id=user.id, action="create", table_name="ropa_records",
        record_id=record.id, new_value=_record_snapshot(record), reason=data.reason,
    )
    db.refresh(record)
    return record


def get_ropa_record(db: Session, record_id: int, user: User) -> RopaRecord:
    """Get a single ROPA record with all relations. Enforces department scoping."""
    record = _base_query(db).filter(RopaRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="ไม่พบ ROPA Record")

    # Department_User can only see own department
    if user.role == "Department_User" and record.department_id != user.department_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="ไม่มีสิทธิ์เข้าถึง ROPA Record นี้")

    return record


def update_ropa_record(db: Session, record_id: int, data: RopaRecordUpdate, user: User) -> RopaRecord:
    """Update a ROPA record. If approved → pending_edit_approval."""
    record = get_ropa_record(db, record_id, user)

    if record.is_deleted:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="ไม่สามารถแก้ไข ROPA Record ที่ถูกลบแล้ว")

    # Department_User can only edit own department
    if user.role == "Department_User" and record.department_id != user.department_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="ไม่มีสิทธิ์แก้ไข ROPA Record นี้")

    old_snapshot = _record_snapshot(record)

    # Apply field updates
    update_data = data.model_dump(exclude={"data_subject_category_ids", "personal_data_type_ids", "reason"}, exclude_unset=True)
    for key, value in update_data.items():
        setattr(record, key, value)

    # Status transition: approved → pending_edit_approval
    if record.status == "approved":
        record.status = "pending_edit_approval"

    # Update junction tables if provided
    if data.data_subject_category_ids is not None:
        _sync_junction(
            db, record,
            data.data_subject_category_ids,
            data.personal_data_type_ids if data.personal_data_type_ids is not None else [ds.id for ds in record.data_subjects],
        )
    elif data.personal_data_type_ids is not None:
        _sync_junction(
            db, record,
            [ds.id for ds in record.data_subjects],
            data.personal_data_type_ids,
        )

    db.flush()
    db.refresh(record)

    new_snapshot = _record_snapshot(record)
    _create_version(db, record, user.id, reason=data.reason)
    db.flush()

    # log_action commits the transaction
    log_action(
        db, user_id=user.id, action="update", table_name="ropa_records",
        record_id=record.id, old_value=old_snapshot, new_value=new_snapshot, reason=data.reason,
    )
    db.refresh(record)
    return record


def delete_ropa_record(db: Session, record_id: int, reason: str, user: User) -> RopaRecord:
    """Soft-delete a ROPA record. If approved → pending_delete_approval."""
    record = get_ropa_record(db, record_id, user)

    if record.is_deleted:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="ROPA Record นี้ถูกลบแล้ว")

    # Department_User can only delete own department
    if user.role == "Department_User" and record.department_id != user.department_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="ไม่มีสิทธิ์ลบ ROPA Record นี้")

    old_snapshot = _record_snapshot(record)

    if record.status == "approved":
        record.status = "pending_delete_approval"
    else:
        # Non-approved records can be soft-deleted directly
        record.is_deleted = True

    # log_action commits the transaction
    log_action(
        db, user_id=user.id, action="delete", table_name="ropa_records",
        record_id=record.id, old_value=old_snapshot, reason=reason,
    )
    db.refresh(record)
    return record


# ---------------------------------------------------------------------------
# List with pagination, search, filter, sort
# ---------------------------------------------------------------------------

_SORTABLE_COLUMNS = {
    "created_at": RopaRecord.created_at,
    "updated_at": RopaRecord.updated_at,
    "activity_name": RopaRecord.activity_name,
    "process_name": RopaRecord.process_name,
    "risk_level": RopaRecord.risk_level,
    "status": RopaRecord.status,
}


def list_ropa_records(
    db: Session,
    user: User,
    page: int = 1,
    per_page: int = 20,
    search: Optional[str] = None,
    department_id: Optional[int] = None,
    role_type: Optional[str] = None,
    risk_level: Optional[str] = None,
    legal_basis: Optional[str] = None,
    record_status: Optional[str] = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
) -> dict:
    """List ROPA records with pagination, search, filters, sort, and dept scoping."""
    query = _base_query(db).filter(RopaRecord.is_deleted == False)

    # Department_User scoping
    query = _apply_dept_scope(query, user)

    # Filters
    if department_id is not None:
        query = query.filter(RopaRecord.department_id == department_id)
    if role_type:
        query = query.filter(RopaRecord.role_type == role_type)
    if risk_level:
        query = query.filter(RopaRecord.risk_level == risk_level)
    if legal_basis:
        query = query.filter(RopaRecord.legal_basis_thai == legal_basis)
    if record_status:
        query = query.filter(RopaRecord.status == record_status)

    # Search across activity_name, process_name, purpose
    if search:
        pattern = f"%{search}%"
        query = query.filter(
            or_(
                RopaRecord.activity_name.ilike(pattern),
                RopaRecord.process_name.ilike(pattern),
                RopaRecord.purpose.ilike(pattern),
            )
        )

    # Count before pagination
    total = query.count()

    # Sort
    sort_col = _SORTABLE_COLUMNS.get(sort_by, RopaRecord.created_at)
    if sort_order == "asc":
        query = query.order_by(sort_col.asc())
    else:
        query = query.order_by(sort_col.desc())

    items = query.offset((page - 1) * per_page).limit(per_page).all()
    pages = ceil(total / per_page) if per_page else 1

    return {
        "items": items,
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": pages,
    }
