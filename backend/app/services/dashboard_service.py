"""Dashboard service — aggregation queries for ROPA analytics."""

from datetime import date, timedelta

from sqlalchemy import func, extract
from sqlalchemy.orm import Session

from app.models.department import Department
from app.models.personal_data_type import PersonalDataType
from app.models.ropa_personal_data_type import RopaPersonalDataType
from app.models.ropa_record import RopaRecord
from app.models.user import User


# Fields used for completeness calculation (the 8-section key fields)
_COMPLETENESS_FIELDS = [
    "activity_name", "purpose", "risk_level",
    "data_acquisition_method", "data_source_direct",
    "legal_basis_thai",
    "retention_period", "storage_type", "storage_method",
    "access_rights", "deletion_method",
    "data_owner",
    "security_organizational", "security_technical", "security_physical",
    "security_access_control",
]


def _dept_scope(query, user: User):
    """Auto-filter by department for Department_User role."""
    if user.role == "Department_User":
        if user.department_id is None:
            # Department_User without a department should see nothing
            query = query.filter(RopaRecord.id == -1)
        else:
            query = query.filter(RopaRecord.department_id == user.department_id)
    return query


def _active_records(db: Session):
    """Base filter: non-deleted records."""
    return db.query(RopaRecord).filter(RopaRecord.is_deleted == False)


# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------

def get_summary(db: Session, user: User) -> dict:
    """Total ROPA count, distribution by department / risk_level / legal_basis."""
    base = _active_records(db)
    base = _dept_scope(base, user)

    total = base.count()

    # By department
    by_dept_rows = (
        base.with_entities(Department.name, func.count(RopaRecord.id))
        .join(Department, RopaRecord.department_id == Department.id)
        .group_by(Department.name)
        .all()
    )
    by_department = [{"department": name, "count": cnt} for name, cnt in by_dept_rows]

    # By risk level
    by_risk_rows = (
        base.with_entities(RopaRecord.risk_level, func.count(RopaRecord.id))
        .group_by(RopaRecord.risk_level)
        .all()
    )
    by_risk_level = [{"risk_level": rl or "unspecified", "count": cnt} for rl, cnt in by_risk_rows]

    # By legal basis
    by_lb_rows = (
        base.with_entities(RopaRecord.legal_basis_thai, func.count(RopaRecord.id))
        .group_by(RopaRecord.legal_basis_thai)
        .all()
    )
    by_legal_basis = [{"legal_basis": lb or "unspecified", "count": cnt} for lb, cnt in by_lb_rows]

    return {
        "total": total,
        "by_department": by_department,
        "by_risk_level": by_risk_level,
        "by_legal_basis": by_legal_basis,
    }


# ---------------------------------------------------------------------------
# Completeness
# ---------------------------------------------------------------------------

def get_completeness(db: Session, user: User) -> dict:
    """Field fill rate per record and overall average."""
    base = _dept_scope(_active_records(db), user)
    records = base.all()

    total_fields = len(_COMPLETENESS_FIELDS)
    per_record: list[dict] = []
    total_filled_sum = 0

    for rec in records:
        filled = sum(1 for f in _COMPLETENESS_FIELDS if getattr(rec, f, None) not in (None, ""))
        pct = round((filled / total_fields) * 100, 2) if total_fields else 0
        per_record.append({"record_id": rec.id, "activity_name": rec.activity_name, "filled": filled, "total": total_fields, "completeness_pct": pct})
        total_filled_sum += filled

    avg = round((total_filled_sum / (len(records) * total_fields)) * 100, 2) if records else 0

    return {"average_completeness_pct": avg, "records": per_record}


# ---------------------------------------------------------------------------
# Trends
# ---------------------------------------------------------------------------

def get_trends(db: Session, user: User) -> dict:
    """Monthly creation count."""
    base = _dept_scope(_active_records(db), user)

    rows = (
        base.with_entities(
            extract("year", RopaRecord.created_at).label("year"),
            extract("month", RopaRecord.created_at).label("month"),
            func.count(RopaRecord.id),
        )
        .group_by("year", "month")
        .order_by("year", "month")
        .all()
    )

    trends = [{"year": int(y), "month": int(m), "count": cnt} for y, m, cnt in rows]
    return {"monthly_trends": trends}


# ---------------------------------------------------------------------------
# Risk Heatmap
# ---------------------------------------------------------------------------

def get_risk_heatmap(db: Session, user: User) -> dict:
    """Risk level by department × personal data type."""
    base = _dept_scope(_active_records(db), user)

    rows = (
        base.with_entities(
            Department.name.label("department"),
            PersonalDataType.name.label("data_type"),
            RopaRecord.risk_level,
            func.count(RopaRecord.id).label("count"),
        )
        .join(Department, RopaRecord.department_id == Department.id)
        .join(RopaPersonalDataType, RopaRecord.id == RopaPersonalDataType.ropa_record_id)
        .join(PersonalDataType, RopaPersonalDataType.personal_data_type_id == PersonalDataType.id)
        .group_by(Department.name, PersonalDataType.name, RopaRecord.risk_level)
        .all()
    )

    heatmap = [
        {"department": dept, "data_type": dt, "risk_level": rl or "unspecified", "count": cnt}
        for dept, dt, rl, cnt in rows
    ]
    return {"heatmap": heatmap}


# ---------------------------------------------------------------------------
# Compliance Scores
# ---------------------------------------------------------------------------

def get_compliance_scores(db: Session, user: User) -> dict:
    """Per department: completeness rate + legal basis coverage."""
    base = _dept_scope(_active_records(db), user)

    records = (
        base.with_entities(
            Department.id.label("dept_id"),
            Department.name.label("dept_name"),
            RopaRecord,
        )
        .join(Department, RopaRecord.department_id == Department.id)
        .all()
    )

    dept_data: dict[int, dict] = {}
    for dept_id, dept_name, rec in records:
        if dept_id not in dept_data:
            dept_data[dept_id] = {"name": dept_name, "records": []}
        dept_data[dept_id]["records"].append(rec)

    total_fields = len(_COMPLETENESS_FIELDS)
    scores: list[dict] = []
    for dept_id, info in dept_data.items():
        recs = info["records"]
        count = len(recs)
        if count == 0:
            continue

        # Completeness
        filled_sum = sum(
            sum(1 for f in _COMPLETENESS_FIELDS if getattr(r, f, None) not in (None, ""))
            for r in recs
        )
        completeness = round((filled_sum / (count * total_fields)) * 100, 2) if total_fields else 0

        # Legal basis coverage
        with_lb = sum(1 for r in recs if r.legal_basis_thai not in (None, ""))
        lb_coverage = round((with_lb / count) * 100, 2)

        # Combined score (average of both)
        combined = round((completeness + lb_coverage) / 2, 2)

        scores.append({
            "department_id": dept_id,
            "department": info["name"],
            "record_count": count,
            "completeness_pct": completeness,
            "legal_basis_coverage_pct": lb_coverage,
            "compliance_score": combined,
        })

    return {"scores": scores}


# ---------------------------------------------------------------------------
# Status Overview
# ---------------------------------------------------------------------------

def get_status_overview(db: Session, user: User) -> dict:
    """Count per status."""
    base = _dept_scope(_active_records(db), user)

    rows = (
        base.with_entities(RopaRecord.status, func.count(RopaRecord.id))
        .group_by(RopaRecord.status)
        .all()
    )

    statuses = {s: cnt for s, cnt in rows}
    return {"statuses": statuses}


# ---------------------------------------------------------------------------
# Sensitive Data Mapping
# ---------------------------------------------------------------------------

def get_sensitive_data_mapping(db: Session, user: User) -> dict:
    """Departments with most sensitive data.

    Returns ALL departments that have ROPA records (even those with 0
    sensitive data types) so the chart always shows a complete picture.
    """
    base = _dept_scope(_active_records(db), user)

    # Build a subquery of active record IDs to avoid ambiguous joins
    active_ids = base.with_entities(RopaRecord.id).subquery()

    # All departments that own at least one active ROPA record
    all_depts = (
        db.query(Department.name)
        .join(RopaRecord, RopaRecord.department_id == Department.id)
        .filter(RopaRecord.id.in_(db.query(active_ids)))
        .distinct()
        .all()
    )
    dept_counts: dict[str, int] = {name: 0 for (name,) in all_depts}

    # Count sensitive data per department
    rows = (
        db.query(
            Department.name.label("department"),
            func.count(RopaPersonalDataType.personal_data_type_id).label("sensitive_count"),
        )
        .select_from(RopaRecord)
        .filter(RopaRecord.id.in_(db.query(active_ids)))
        .join(Department, RopaRecord.department_id == Department.id)
        .join(RopaPersonalDataType, RopaRecord.id == RopaPersonalDataType.ropa_record_id)
        .join(PersonalDataType, RopaPersonalDataType.personal_data_type_id == PersonalDataType.id)
        .filter(PersonalDataType.sensitivity_level == "sensitive")
        .group_by(Department.name)
        .all()
    )

    for dept, cnt in rows:
        dept_counts[dept] = cnt

    # Sort descending by count, then alphabetically
    mapping = sorted(
        [{"department": dept, "sensitive_data_count": cnt} for dept, cnt in dept_counts.items()],
        key=lambda x: (-x["sensitive_data_count"], x["department"]),
    )
    return {"mapping": mapping}


# ---------------------------------------------------------------------------
# Retention Alerts Summary
# ---------------------------------------------------------------------------

def get_retention_alerts_summary(db: Session, user: User) -> dict:
    """Summary counts: overdue / within_30 / within_60_90 / review_overdue."""
    today = date.today()

    # Retention-based
    retention_q = (
        _dept_scope(_active_records(db), user)
        .filter(
            RopaRecord.status == "approved",
            RopaRecord.retention_expiry_date.isnot(None),
        )
    )
    retention_records = retention_q.all()

    overdue = 0
    within_30 = 0
    within_60_90 = 0

    for rec in retention_records:
        expiry = rec.retention_expiry_date
        if expiry < today:
            overdue += 1
        elif expiry <= today + timedelta(days=30):
            within_30 += 1
        elif expiry <= today + timedelta(days=90):
            within_60_90 += 1

    # Review-based
    review_overdue = (
        _dept_scope(_active_records(db), user)
        .filter(
            RopaRecord.status == "approved",
            RopaRecord.next_review_date.isnot(None),
            RopaRecord.next_review_date < today,
        )
        .count()
    )

    return {
        "overdue": overdue,
        "within_30": within_30,
        "within_60_90": within_60_90,
        "review_overdue": review_overdue,
    }
