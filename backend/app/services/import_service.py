"""Import service for parsing and importing ROPA records from Excel files."""

from datetime import date, datetime
from io import BytesIO
from typing import Optional

from openpyxl import load_workbook
from openpyxl.worksheet.worksheet import Worksheet
from sqlalchemy.orm import Session

from app.models.controller import Controller
from app.models.data_subject_category import DataSubjectCategory
from app.models.department import Department
from app.models.import_batch import ImportBatch
from app.models.personal_data_type import PersonalDataType
from app.models.processor import Processor
from app.models.ropa_data_subject import RopaDataSubject
from app.models.ropa_personal_data_type import RopaPersonalDataType
from app.models.ropa_record import RopaRecord
from app.schemas.import_export import ImportPreviewResponse, ImportRowData, ImportRowError
from app.services.audit_service import log_action


# Column headers that indicate a Processor sheet (has processor-specific columns)
PROCESSOR_INDICATORS = {"processor_name", "source_controller", "data_category"}

# Column mapping: Excel header → model field
COLUMN_MAP = {
    "process_name": "process_name",
    "activity_name": "activity_name",
    "department": "department",
    "purpose": "purpose",
    "risk_level": "risk_level",
    "data_subject_categories": "data_subject_categories",
    "personal_data_types": "personal_data_types",
    "data_acquisition_method": "data_acquisition_method",
    "data_source_direct": "data_source_direct",
    "data_source_other": "data_source_other",
    "legal_basis_thai": "legal_basis_thai",
    "legal_basis_gdpr": "legal_basis_gdpr",
    "minor_consent_under_10": "minor_consent_under_10",
    "minor_consent_10_20": "minor_consent_10_20",
    "cross_border_transfer": "cross_border_transfer",
    "cross_border_affiliate": "cross_border_affiliate",
    "cross_border_method": "cross_border_method",
    "cross_border_standard": "cross_border_standard",
    "cross_border_exception": "cross_border_exception",
    "retention_period": "retention_period",
    "retention_expiry_date": "retention_expiry_date",
    "next_review_date": "next_review_date",
    "storage_type": "storage_type",
    "storage_method": "storage_method",
    "access_rights": "access_rights",
    "deletion_method": "deletion_method",
    "data_owner": "data_owner",
    "third_party_recipients": "third_party_recipients",
    "disclosure_exemption": "disclosure_exemption",
    "rights_refusal": "rights_refusal",
    "security_organizational": "security_organizational",
    "security_technical": "security_technical",
    "security_physical": "security_physical",
    "security_access_control": "security_access_control",
    "security_responsibility": "security_responsibility",
    "security_audit": "security_audit",
    # Processor-specific
    "controller_name": "controller_name",
    "processor_name": "processor_name",
    "source_controller": "source_controller",
    "data_category": "data_category",
}


def _normalize_header(header: str) -> str:
    """Normalize a column header to a snake_case key."""
    return header.strip().lower().replace(" ", "_").replace("-", "_")


def _detect_sheet_type(headers: list[str]) -> str:
    """Detect whether a sheet is Controller or Processor based on column headers."""
    normalized = {_normalize_header(h) for h in headers if h}
    if normalized & PROCESSOR_INDICATORS:
        return "Processor"
    return "Controller"


def _parse_bool(value: Optional[str]) -> Optional[bool]:
    """Parse Y/N/Yes/No/True/False to boolean."""
    if value is None:
        return None
    v = str(value).strip().lower()
    if v in ("y", "yes", "true", "1"):
        return True
    if v in ("n", "no", "false", "0"):
        return False
    return None


def _parse_date(value) -> Optional[date]:
    """Parse a date value from Excel (could be datetime, date, or string)."""
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    # Try parsing string formats
    s = str(value).strip()
    if not s:
        return None
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%d-%m-%Y"):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    return None


def _cell_str(value) -> Optional[str]:
    """Convert a cell value to a stripped string or None."""
    if value is None:
        return None
    s = str(value).strip()
    return s if s else None


def _build_lookup_maps(db: Session) -> dict:
    """Build lookup maps for departments, controllers, processors, data subjects, personal data types."""
    departments = db.query(Department).filter(Department.is_active == True).all()
    dept_by_name = {d.name.lower(): d for d in departments}
    dept_by_code = {d.code.lower(): d for d in departments}

    controllers = db.query(Controller).filter(Controller.is_active == True).all()
    ctrl_by_name = {c.name.lower(): c for c in controllers}

    processors = db.query(Processor).filter(Processor.is_active == True).all()
    proc_by_name = {p.name.lower(): p for p in processors}

    ds_categories = db.query(DataSubjectCategory).all()
    ds_by_name = {d.name.lower(): d for d in ds_categories}

    pdt_types = db.query(PersonalDataType).all()
    pdt_by_name = {p.name.lower(): p for p in pdt_types}

    return {
        "dept_by_name": dept_by_name,
        "dept_by_code": dept_by_code,
        "ctrl_by_name": ctrl_by_name,
        "proc_by_name": proc_by_name,
        "ds_by_name": ds_by_name,
        "pdt_by_name": pdt_by_name,
    }


def _validate_row(
    row_data: dict,
    row_number: int,
    sheet_name: str,
    role_type: str,
    lookups: dict,
) -> tuple[Optional[ImportRowData], list[ImportRowError]]:
    """Validate a single row and return parsed data or errors."""
    errors: list[ImportRowError] = []

    # Required: activity_name
    activity_name = _cell_str(row_data.get("activity_name"))
    if not activity_name:
        errors.append(ImportRowError(
            sheet_name=sheet_name, row_number=row_number,
            field_name="activity_name", error_reason="activity_name is required",
        ))

    # Required: department (match by name or code)
    dept_val = _cell_str(row_data.get("department"))
    department_id = None
    if not dept_val:
        errors.append(ImportRowError(
            sheet_name=sheet_name, row_number=row_number,
            field_name="department", error_reason="department is required",
        ))
    else:
        dept_lower = dept_val.lower()
        dept = lookups["dept_by_name"].get(dept_lower) or lookups["dept_by_code"].get(dept_lower)
        if not dept:
            errors.append(ImportRowError(
                sheet_name=sheet_name, row_number=row_number,
                field_name="department", error_reason=f"Department '{dept_val}' not found",
            ))
        else:
            department_id = dept.id

    # risk_level validation
    risk_level = _cell_str(row_data.get("risk_level"))
    if risk_level and risk_level not in ("Low", "Medium", "High"):
        errors.append(ImportRowError(
            sheet_name=sheet_name, row_number=row_number,
            field_name="risk_level", error_reason=f"risk_level must be Low, Medium, or High (got '{risk_level}')",
        ))

    # cross_border_transfer
    cbt_raw = _cell_str(row_data.get("cross_border_transfer"))
    cross_border_transfer = None
    if cbt_raw is not None:
        cross_border_transfer = _parse_bool(cbt_raw)
        if cross_border_transfer is None:
            errors.append(ImportRowError(
                sheet_name=sheet_name, row_number=row_number,
                field_name="cross_border_transfer",
                error_reason=f"cross_border_transfer must be Y/N/Yes/No/True/False (got '{cbt_raw}')",
            ))

    # Date fields
    retention_expiry_date = None
    red_raw = row_data.get("retention_expiry_date")
    if red_raw is not None:
        retention_expiry_date = _parse_date(red_raw)
        if retention_expiry_date is None and _cell_str(red_raw):
            errors.append(ImportRowError(
                sheet_name=sheet_name, row_number=row_number,
                field_name="retention_expiry_date",
                error_reason=f"Invalid date format for retention_expiry_date",
            ))

    next_review_date = None
    nrd_raw = row_data.get("next_review_date")
    if nrd_raw is not None:
        next_review_date = _parse_date(nrd_raw)
        if next_review_date is None and _cell_str(nrd_raw):
            errors.append(ImportRowError(
                sheet_name=sheet_name, row_number=row_number,
                field_name="next_review_date",
                error_reason=f"Invalid date format for next_review_date",
            ))

    # Data subject categories (comma-separated names)
    ds_ids: list[int] = []
    ds_raw = _cell_str(row_data.get("data_subject_categories"))
    if ds_raw:
        for name in ds_raw.split(","):
            name = name.strip()
            if not name:
                continue
            ds = lookups["ds_by_name"].get(name.lower())
            if ds:
                ds_ids.append(ds.id)
            else:
                errors.append(ImportRowError(
                    sheet_name=sheet_name, row_number=row_number,
                    field_name="data_subject_categories",
                    error_reason=f"Data subject category '{name}' not found",
                ))

    # Personal data types (comma-separated names)
    pdt_ids: list[int] = []
    pdt_raw = _cell_str(row_data.get("personal_data_types"))
    if pdt_raw:
        for name in pdt_raw.split(","):
            name = name.strip()
            if not name:
                continue
            pdt = lookups["pdt_by_name"].get(name.lower())
            if pdt:
                pdt_ids.append(pdt.id)
            else:
                errors.append(ImportRowError(
                    sheet_name=sheet_name, row_number=row_number,
                    field_name="personal_data_types",
                    error_reason=f"Personal data type '{name}' not found",
                ))

    # Controller/Processor lookup
    controller_id = None
    processor_id = None
    if role_type == "Controller":
        ctrl_name = _cell_str(row_data.get("controller_name"))
        if ctrl_name:
            ctrl = lookups["ctrl_by_name"].get(ctrl_name.lower())
            if ctrl:
                controller_id = ctrl.id
            else:
                errors.append(ImportRowError(
                    sheet_name=sheet_name, row_number=row_number,
                    field_name="controller_name",
                    error_reason=f"Controller '{ctrl_name}' not found",
                ))
    else:  # Processor
        proc_name = _cell_str(row_data.get("processor_name"))
        if proc_name:
            proc = lookups["proc_by_name"].get(proc_name.lower())
            if proc:
                processor_id = proc.id
            else:
                errors.append(ImportRowError(
                    sheet_name=sheet_name, row_number=row_number,
                    field_name="processor_name",
                    error_reason=f"Processor '{proc_name}' not found",
                ))

    if errors:
        return None, errors

    row = ImportRowData(
        sheet_name=sheet_name,
        row_number=row_number,
        role_type=role_type,
        department_id=department_id,
        controller_id=controller_id,
        processor_id=processor_id,
        data_subject_category_ids=ds_ids,
        personal_data_type_ids=pdt_ids,
        process_name=_cell_str(row_data.get("process_name")),
        activity_name=activity_name,
        purpose=_cell_str(row_data.get("purpose")),
        risk_level=risk_level,
        data_acquisition_method=_cell_str(row_data.get("data_acquisition_method")),
        data_source_direct=_cell_str(row_data.get("data_source_direct")),
        data_source_other=_cell_str(row_data.get("data_source_other")),
        legal_basis_thai=_cell_str(row_data.get("legal_basis_thai")),
        legal_basis_gdpr=_cell_str(row_data.get("legal_basis_gdpr")),
        minor_consent_under_10=_cell_str(row_data.get("minor_consent_under_10")),
        minor_consent_10_20=_cell_str(row_data.get("minor_consent_10_20")),
        cross_border_transfer=cross_border_transfer,
        cross_border_affiliate=_cell_str(row_data.get("cross_border_affiliate")),
        cross_border_method=_cell_str(row_data.get("cross_border_method")),
        cross_border_standard=_cell_str(row_data.get("cross_border_standard")),
        cross_border_exception=_cell_str(row_data.get("cross_border_exception")),
        retention_period=_cell_str(row_data.get("retention_period")),
        retention_expiry_date=retention_expiry_date,
        next_review_date=next_review_date,
        storage_type=_cell_str(row_data.get("storage_type")),
        storage_method=_cell_str(row_data.get("storage_method")),
        access_rights=_cell_str(row_data.get("access_rights")),
        deletion_method=_cell_str(row_data.get("deletion_method")),
        data_owner=_cell_str(row_data.get("data_owner")),
        third_party_recipients=_cell_str(row_data.get("third_party_recipients")),
        disclosure_exemption=_cell_str(row_data.get("disclosure_exemption")),
        rights_refusal=_cell_str(row_data.get("rights_refusal")),
        security_organizational=_cell_str(row_data.get("security_organizational")),
        security_technical=_cell_str(row_data.get("security_technical")),
        security_physical=_cell_str(row_data.get("security_physical")),
        security_access_control=_cell_str(row_data.get("security_access_control")),
        security_responsibility=_cell_str(row_data.get("security_responsibility")),
        security_audit=_cell_str(row_data.get("security_audit")),
    )
    return row, errors


def _parse_sheet(
    ws: Worksheet,
    sheet_name: str,
    lookups: dict,
) -> tuple[list[ImportRowData], list[ImportRowError]]:
    """Parse a single worksheet and return valid rows + errors."""
    rows = list(ws.iter_rows(values_only=False))
    if not rows:
        return [], []

    # Read headers from first row
    headers = [_cell_str(cell.value) for cell in rows[0]]
    if not any(headers):
        return [], []

    normalized_headers = [_normalize_header(h) if h else None for h in headers]
    role_type = _detect_sheet_type([h for h in headers if h])

    valid_rows: list[ImportRowData] = []
    all_errors: list[ImportRowError] = []

    for row_idx, row in enumerate(rows[1:], start=2):  # row 2 onwards (1-indexed, header is row 1)
        row_data: dict = {}
        has_data = False
        for col_idx, cell in enumerate(row):
            if col_idx < len(normalized_headers) and normalized_headers[col_idx]:
                key = COLUMN_MAP.get(normalized_headers[col_idx], normalized_headers[col_idx])
                row_data[key] = cell.value
                if cell.value is not None:
                    has_data = True

        if not has_data:
            continue  # Skip empty rows

        parsed, errors = _validate_row(row_data, row_idx, sheet_name, role_type, lookups)
        if parsed:
            valid_rows.append(parsed)
        all_errors.extend(errors)

    return valid_rows, all_errors


def preview_import(db: Session, file_content: bytes) -> ImportPreviewResponse:
    """Parse an Excel file and return a preview with valid rows and errors."""
    wb = load_workbook(filename=BytesIO(file_content), read_only=False, data_only=True)
    lookups = _build_lookup_maps(db)

    all_valid: list[ImportRowData] = []
    all_errors: list[ImportRowError] = []
    total_rows = 0

    for sheet_name in wb.sheetnames:
        ws = wb[sheet_name]
        valid, errors = _parse_sheet(ws, sheet_name, lookups)
        all_valid.extend(valid)
        all_errors.extend(errors)
        # Count data rows (exclude header)
        data_row_count = sum(
            1 for row in ws.iter_rows(min_row=2, values_only=True)
            if any(v is not None for v in row)
        )
        total_rows += data_row_count

    wb.close()

    return ImportPreviewResponse(
        valid_rows=all_valid,
        errors=all_errors,
        total_rows=total_rows,
        valid_count=len(all_valid),
        error_count=len(all_errors),
    )


def confirm_import(
    db: Session,
    file_content: bytes,
    filename: str,
    user_id: int,
) -> ImportBatch:
    """Re-parse the file and import only valid rows, creating ROPA records."""
    wb = load_workbook(filename=BytesIO(file_content), read_only=False, data_only=True)
    lookups = _build_lookup_maps(db)

    all_valid: list[ImportRowData] = []
    all_errors: list[ImportRowError] = []

    for sheet_name in wb.sheetnames:
        ws = wb[sheet_name]
        valid, errors = _parse_sheet(ws, sheet_name, lookups)
        all_valid.extend(valid)
        all_errors.extend(errors)

    wb.close()

    rows_success = 0
    rows_failed = len(all_errors)

    for row in all_valid:
        record = RopaRecord(
            department_id=row.department_id,
            created_by=user_id,
            role_type=row.role_type,
            status="pending_approval",
            controller_id=row.controller_id,
            processor_id=row.processor_id,
            process_name=row.process_name,
            activity_name=row.activity_name,
            purpose=row.purpose,
            risk_level=row.risk_level,
            data_acquisition_method=row.data_acquisition_method,
            data_source_direct=row.data_source_direct,
            data_source_other=row.data_source_other,
            legal_basis_thai=row.legal_basis_thai,
            legal_basis_gdpr=row.legal_basis_gdpr,
            minor_consent_under_10=row.minor_consent_under_10,
            minor_consent_10_20=row.minor_consent_10_20,
            cross_border_transfer=row.cross_border_transfer,
            cross_border_affiliate=row.cross_border_affiliate,
            cross_border_method=row.cross_border_method,
            cross_border_standard=row.cross_border_standard,
            cross_border_exception=row.cross_border_exception,
            retention_period=row.retention_period,
            retention_expiry_date=row.retention_expiry_date,
            next_review_date=row.next_review_date,
            storage_type=row.storage_type,
            storage_method=row.storage_method,
            access_rights=row.access_rights,
            deletion_method=row.deletion_method,
            data_owner=row.data_owner,
            third_party_recipients=row.third_party_recipients,
            disclosure_exemption=row.disclosure_exemption,
            rights_refusal=row.rights_refusal,
            security_organizational=row.security_organizational,
            security_technical=row.security_technical,
            security_physical=row.security_physical,
            security_access_control=row.security_access_control,
            security_responsibility=row.security_responsibility,
            security_audit=row.security_audit,
        )
        db.add(record)
        db.flush()

        # Junction tables
        for ds_id in set(row.data_subject_category_ids):
            db.add(RopaDataSubject(ropa_record_id=record.id, data_subject_category_id=ds_id))
        for pdt_id in set(row.personal_data_type_ids):
            db.add(RopaPersonalDataType(ropa_record_id=record.id, personal_data_type_id=pdt_id))

        rows_success += 1

    # Create ImportBatch record
    error_details = None
    if all_errors:
        error_details = {"errors": [e.model_dump() for e in all_errors]}

    batch_status = "completed"
    if rows_success == 0 and rows_failed > 0:
        batch_status = "failed"
    elif rows_failed > 0:
        batch_status = "partial"

    batch = ImportBatch(
        imported_by=user_id,
        filename=filename,
        rows_success=rows_success,
        rows_failed=rows_failed,
        status=batch_status,
        error_details=error_details,
    )
    db.add(batch)
    db.flush()

    # Audit log
    log_action(
        db,
        user_id=user_id,
        action="import",
        table_name="ropa_records",
        record_id=batch.id,
        new_value={
            "filename": filename,
            "rows_success": rows_success,
            "rows_failed": rows_failed,
            "status": batch_status,
        },
        reason=f"Imported {rows_success} ROPA records from {filename}",
    )

    return batch


def list_import_batches(db: Session, page: int = 1, per_page: int = 20) -> dict:
    """List import batches with pagination."""
    query = db.query(ImportBatch).order_by(ImportBatch.created_at.desc())
    total = query.count()
    items = query.offset((page - 1) * per_page).limit(per_page).all()
    return {
        "items": items,
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": (total + per_page - 1) // per_page if per_page else 0,
    }
