"""ROPA Record service — CRUD, approval workflow helpers, version snapshots."""

from datetime import date, datetime, timedelta
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



# Internal helpers


_RECORD_FIELDS = [
    "department_id", "role_type", "controller_id", "processor_id",
    "activity_name", "purpose", "risk_level",
    "data_acquisition_method", "data_source_direct", "data_source_other",
    "legal_basis_thai",
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


def _enrich_with_edit_info(db: Session, record: RopaRecord) -> RopaRecord:
    """Attach latest edit reason and editee info to a record."""
    # Get the latest version if version_number > 1 (meaning it was edited)
    latest_version = (
        db.query(RecordVersion)
        .filter(RecordVersion.ropa_record_id == record.id)
        .order_by(RecordVersion.version_number.desc())
        .first()
    )
    
    # Add dynamic attributes (not persisted)
    if latest_version and latest_version.version_number > 1:
        # This record has been edited, get the editor info
        editor = (
            db.query(User)
            .filter(User.id == latest_version.changed_by)
            .first()
        )
        record.edit_reason = latest_version.change_reason
        record.edited_by = editor
        record.edited_at = latest_version.created_at
    else:
        record.edit_reason = None
        record.edited_by = None
        record.edited_at = None
    
    return record


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
        if user.department_id is None:
            # Department_User without a department should see nothing
            query = query.filter(RopaRecord.id == -1)
        else:
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
    """Update a ROPA record. Status transitions:
    - approved → pending_edit_approval
    - rejected + never approved (approved_at is null) → pending_approval (creation approval)
    - rejected + was approved (approved_at is not null) → pending_edit_approval (edit approval)
    """
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

    # Status transition based on current state and approval history
    if record.status == "approved":
        record.status = "pending_edit_approval"
    elif record.status == "rejected":
        # For rejected records, check if it was ever approved before
        if record.approved_at is not None:
            # Was previously approved, resubmitting an edit
            record.status = "pending_edit_approval"
        else:
            # Never approved, resubmitting initial creation
            record.status = "pending_approval"
        # Note: Keep rejection_reason for audit trail visibility

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

    # Search across activity_name, purpose
    if search:
        pattern = f"%{search}%"
        query = query.filter(
            or_(
                RopaRecord.activity_name.ilike(pattern),
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



# DPO Approval Workflow


_PENDING_STATUSES = ("pending_approval", "pending_edit_approval", "pending_delete_approval")


def list_pending_records(
    db: Session,
    page: int = 1,
    per_page: int = 20,
) -> dict:
    """List ROPA records awaiting DPO approval, including edit reason."""
    query = (
        _base_query(db)
        .filter(
            RopaRecord.is_deleted == False,
            RopaRecord.status.in_(_PENDING_STATUSES),
        )
        .order_by(RopaRecord.created_at.desc())
    )

    total = query.count()
    items = query.offset((page - 1) * per_page).limit(per_page).all()
    pages = ceil(total / per_page) if per_page else 1

    # Enrich each item with edit reason info
    enriched_items = [_enrich_with_edit_info(db, item) for item in items]

    return {
        "items": enriched_items,
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": pages,
    }


def approve_ropa_record(db: Session, record_id: int, user: User) -> RopaRecord:
    """DPO approves a pending ROPA record.

    - pending_approval / pending_edit_approval → approved
    - pending_delete_approval → approved + soft delete
    """
    record = _base_query(db).filter(RopaRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="ไม่พบ ROPA Record")

    if record.status not in _PENDING_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"ไม่สามารถอนุมัติ ROPA Record ที่มีสถานะ '{record.status}' ได้",
        )

    was_pending_delete = record.status == "pending_delete_approval"

    record.status = "approved"
    record.approved_by = user.id
    record.approved_at = datetime.now()
    record.rejection_reason = None  # clear any previous rejection

    if was_pending_delete:
        record.is_deleted = True

    db.flush()

    action_label = "approve_delete" if was_pending_delete else "approve"
    log_action(
        db,
        user_id=user.id,
        action=action_label,
        table_name="ropa_records",
        record_id=record.id,
        new_value=_record_snapshot(record),
    )
    db.refresh(record)
    return record


def reject_ropa_record(db: Session, record_id: int, rejection_reason: str, user: User) -> RopaRecord:
    """DPO rejects a pending ROPA record with a reason."""
    record = _base_query(db).filter(RopaRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="ไม่พบ ROPA Record")

    if record.status not in _PENDING_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"ไม่สามารถปฏิเสธ ROPA Record ที่มีสถานะ '{record.status}' ได้",
        )

    record.status = "rejected"
    record.rejection_reason = rejection_reason
    record.rejected_by = user.id
    record.rejected_at = datetime.now()

    db.flush()

    log_action(
        db,
        user_id=user.id,
        action="reject",
        table_name="ropa_records",
        record_id=record.id,
        new_value={"rejection_reason": rejection_reason},
        reason=f"Rejected: {rejection_reason}",
    )
    db.refresh(record)
    return record


# ---------------------------------------------------------------------------
# Version History
# ---------------------------------------------------------------------------

def list_record_versions(
    db: Session,
    record_id: int,
    user: User,
    page: int = 1,
    per_page: int = 20,
) -> dict:
    """List version snapshots for a ROPA record (newest first)."""
    # Ensure user has access to the record
    get_ropa_record(db, record_id, user)

    query = (
        db.query(RecordVersion)
        .options(joinedload(RecordVersion.changer))
        .filter(RecordVersion.ropa_record_id == record_id)
        .order_by(RecordVersion.version_number.desc())
    )

    total = query.count()
    items = query.offset((page - 1) * per_page).limit(per_page).all()
    pages = ceil(total / per_page) if per_page else 1

    return {
        "items": items,
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": pages,
    }


def get_record_version(db: Session, record_id: int, version_id: int, user: User) -> RecordVersion:
    """Get a single version snapshot by ID."""
    # Ensure user has access to the record
    get_ropa_record(db, record_id, user)

    version = (
        db.query(RecordVersion)
        .options(joinedload(RecordVersion.changer))
        .filter(
            RecordVersion.id == version_id,
            RecordVersion.ropa_record_id == record_id,
        )
        .first()
    )
    if not version:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="ไม่พบ Version ที่ระบุ")
    return version


def compare_record_versions(
    db: Session,
    record_id: int,
    version_id_1: int,
    version_id_2: int,
    user: User,
) -> dict:
    """Compare two version snapshots and return field-level diff."""
    v1 = get_record_version(db, record_id, version_id_1, user)
    v2 = get_record_version(db, record_id, version_id_2, user)

    # Collect all keys from both snapshots
    all_keys = sorted(set(v1.snapshot.keys()) | set(v2.snapshot.keys()))
    changes = []
    for key in all_keys:
        old_val = v1.snapshot.get(key)
        new_val = v2.snapshot.get(key)
        if old_val != new_val:
            changes.append({
                "field": key,
                "old_value": str(old_val) if old_val is not None else None,
                "new_value": str(new_val) if new_val is not None else None,
            })

    return {"version_1": v1, "version_2": v2, "changes": changes}


# ---------------------------------------------------------------------------
# Retention Alerts
# ---------------------------------------------------------------------------

def get_retention_alerts(
    db: Session,
    user: User,
    urgency: Optional[str] = None,
    department_id: Optional[int] = None,
) -> dict:
    """Return retention and review alerts for approved, non-deleted ROPA records.

    Categories:
      - overdue: retention_expiry_date < today
      - within_30: retention_expiry_date within 30 days from today
      - within_60_90: retention_expiry_date within 60-90 days from today
      - review_overdue: next_review_date < today

    Returns dict with categorised record lists and summary counts.
    """
    today = date.today()

    # --- Retention-based alerts (require retention_expiry_date) ----------
    retention_query = (
        _base_query(db)
        .filter(
            RopaRecord.status == "approved",
            RopaRecord.is_deleted == False,
            RopaRecord.retention_expiry_date.isnot(None),
        )
    )
    retention_query = _apply_dept_scope(retention_query, user)
    if department_id is not None:
        retention_query = retention_query.filter(RopaRecord.department_id == department_id)

    retention_records = retention_query.all()

    overdue: list[RopaRecord] = []
    within_30: list[RopaRecord] = []
    within_60_90: list[RopaRecord] = []

    for rec in retention_records:
        expiry = rec.retention_expiry_date
        if expiry < today:
            overdue.append(rec)
        elif expiry <= today + timedelta(days=30):
            within_30.append(rec)
        elif today + timedelta(days=60) <= expiry <= today + timedelta(days=90):
            within_60_90.append(rec)

    # --- Review-based alerts (require next_review_date) ------------------
    review_query = (
        _base_query(db)
        .filter(
            RopaRecord.status == "approved",
            RopaRecord.is_deleted == False,
            RopaRecord.next_review_date.isnot(None),
            RopaRecord.next_review_date < today,
        )
    )
    review_query = _apply_dept_scope(review_query, user)
    if department_id is not None:
        review_query = review_query.filter(RopaRecord.department_id == department_id)

    review_overdue: list[RopaRecord] = review_query.all()

    # --- Apply urgency filter if requested --------------------------------
    alerts: dict[str, list[RopaRecord]] = {
        "overdue": overdue,
        "within_30": within_30,
        "within_60_90": within_60_90,
        "review_overdue": review_overdue,
    }

    if urgency:
        requested = set(urgency.split(","))
        alerts = {k: v for k, v in alerts.items() if k in requested}

    summary = {k: len(v) for k, v in alerts.items()}

    return {
        "alerts": alerts,
        "summary": summary,
    }
