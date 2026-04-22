"""Export service for generating Excel files from ROPA records."""

from io import BytesIO

from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, PatternFill
from sqlalchemy.orm import Session, joinedload, subqueryload

from app.models.ropa_record import RopaRecord
from app.models.processor import Processor
from app.services.audit_service import log_action


# Column definitions for export sheets
COMMON_COLUMNS = [
    ("activity_name", "Activity Name"),
    ("department", "Department"),
    ("purpose", "Purpose"),
    ("risk_level", "Risk Level"),
    ("data_subject_categories", "Data Subject Categories"),
    ("personal_data_types", "Personal Data Types"),
    ("data_acquisition_method", "Data Acquisition Method"),
    ("data_source_direct", "Data Source Direct"),
    ("data_source_other", "Data Source Other"),
    ("legal_basis_thai", "Legal Basis Thai"),
    ("minor_consent_under_10", "Minor Consent Under 10"),
    ("minor_consent_10_20", "Minor Consent 10-20"),
    ("cross_border_transfer", "Cross Border Transfer"),
    ("cross_border_affiliate", "Cross Border Affiliate"),
    ("cross_border_method", "Cross Border Method"),
    ("cross_border_standard", "Cross Border Standard"),
    ("cross_border_exception", "Cross Border Exception"),
    ("retention_period", "Retention Period"),
    ("retention_expiry_date", "Retention Expiry Date"),
    ("next_review_date", "Next Review Date"),
    ("storage_type", "Storage Type"),
    ("storage_method", "Storage Method"),
    ("access_rights", "Access Rights"),
    ("deletion_method", "Deletion Method"),
    ("data_owner", "Data Owner"),
    ("third_party_recipients", "Third Party Recipients"),
    ("disclosure_exemption", "Disclosure Exemption"),
    ("rights_refusal", "Rights Refusal"),
    ("security_organizational", "Security Organizational"),
    ("security_technical", "Security Technical"),
    ("security_physical", "Security Physical"),
    ("security_access_control", "Security Access Control"),
    ("security_responsibility", "Security Responsibility"),
    ("security_audit", "Security Audit"),
]

CONTROLLER_EXTRA_COLUMNS = [
    ("controller_name", "Controller Name"),
]

PROCESSOR_EXTRA_COLUMNS = [
    ("processor_name", "Processor Name"),
    ("source_controller", "Source Controller"),
    ("data_category", "Data Category"),
]

HEADER_FONT = Font(bold=True, color="FFFFFF")
HEADER_FILL = PatternFill(start_color="4472C4", end_color="4472C4", fill_type="solid")
HEADER_ALIGNMENT = Alignment(horizontal="center", vertical="center", wrap_text=True)


def _get_record_value(record: RopaRecord, field: str) -> str | None:
    """Extract a field value from a ROPA record for export."""
    if field == "department":
        return record.department.name if record.department else None
    if field == "data_subject_categories":
        return ", ".join(ds.name for ds in record.data_subjects) if record.data_subjects else None
    if field == "personal_data_types":
        return ", ".join(pdt.name for pdt in record.personal_data_types) if record.personal_data_types else None
    if field == "controller_name":
        return record.controller.name if record.controller else None
    if field == "processor_name":
        return record.processor.name if record.processor else None
    if field == "source_controller":
        if record.processor and record.processor.source_controller:
            return record.processor.source_controller.name
        return None
    if field == "data_category":
        return record.processor.data_category if record.processor else None
    if field == "cross_border_transfer":
        val = getattr(record, field, None)
        if val is True:
            return "Yes"
        if val is False:
            return "No"
        return None
    if field in ("retention_expiry_date", "next_review_date"):
        val = getattr(record, field, None)
        return val.isoformat() if val else None

    return getattr(record, field, None)


def _write_sheet(ws, records: list[RopaRecord], columns: list[tuple[str, str]]) -> None:
    """Write records to a worksheet with headers and data."""
    # Write headers
    for col_idx, (_, header) in enumerate(columns, start=1):
        cell = ws.cell(row=1, column=col_idx, value=header)
        cell.font = HEADER_FONT
        cell.fill = HEADER_FILL
        cell.alignment = HEADER_ALIGNMENT

    # Write data rows
    for row_idx, record in enumerate(records, start=2):
        for col_idx, (field, _) in enumerate(columns, start=1):
            value = _get_record_value(record, field)
            ws.cell(row=row_idx, column=col_idx, value=value)

    # Auto-adjust column widths
    for col_idx, (_, header) in enumerate(columns, start=1):
        max_len = len(header)
        for row_idx in range(2, len(records) + 2):
            cell_val = ws.cell(row=row_idx, column=col_idx).value
            if cell_val:
                max_len = max(max_len, len(str(cell_val)))
        ws.column_dimensions[ws.cell(row=1, column=col_idx).column_letter].width = min(max_len + 2, 50)


def export_excel(db: Session, user_id: int, 
                 search: str | None = None,
                 department_id: int | None = None,
                 role_type: str | None = None,
                 risk_level: str | None = None,
                 status: str | None = None) -> bytes:
    """Generate an Excel file filtered by the given parameters."""
    from app.models.department import Department

    query = (
        db.query(RopaRecord)
        .filter(RopaRecord.is_deleted == False)
        .options(
            joinedload(RopaRecord.department),
            joinedload(RopaRecord.controller),
            joinedload(RopaRecord.processor).joinedload(Processor.source_controller),
            joinedload(RopaRecord.data_subjects),
            joinedload(RopaRecord.personal_data_types),
        )
    )

    # Apply filters
    if status:
        query = query.filter(RopaRecord.status == status)
    else:
        # Default: export only approved records
        query = query.filter(RopaRecord.status == "approved")

    if department_id:
        query = query.filter(RopaRecord.department_id == department_id)

    if role_type:
        query = query.filter(RopaRecord.role_type == role_type)

    if risk_level:
        query = query.filter(RopaRecord.risk_level == risk_level)

    if search:
        query = query.filter(RopaRecord.activity_name.ilike(f"%{search}%"))

    records = query.all()

    controller_records = [r for r in records if r.role_type == "Controller"]
    processor_records = [r for r in records if r.role_type == "Processor"]

    wb = Workbook()

    # Controller Sheet
    ws_ctrl = wb.active
    ws_ctrl.title = "Controller_Sheet"
    ctrl_columns = CONTROLLER_EXTRA_COLUMNS + COMMON_COLUMNS
    _write_sheet(ws_ctrl, controller_records, ctrl_columns)

    # Processor Sheet
    ws_proc = wb.create_sheet(title="Processor_Sheet")
    proc_columns = PROCESSOR_EXTRA_COLUMNS + COMMON_COLUMNS
    _write_sheet(ws_proc, processor_records, proc_columns)

    # Save to bytes
    output = BytesIO()
    wb.save(output)
    wb.close()
    output.seek(0)
    file_bytes = output.read()

    # Audit log
    log_action(
        db,
        user_id=user_id,
        action="export",
        table_name="ropa_records",
        record_id=0,
        new_value={
            "controller_count": len(controller_records),
            "processor_count": len(processor_records),
            "total_records": len(records),
        },
        reason=f"Exported {len(records)} approved ROPA records to Excel",
    )

    return file_bytes
