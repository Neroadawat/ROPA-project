"""Import service for parsing and importing ROPA records from Thai Excel form."""

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
from app.models.record_version import RecordVersion
from app.models.ropa_data_subject import RopaDataSubject
from app.models.ropa_personal_data_type import RopaPersonalDataType
from app.models.ropa_record import RopaRecord
from app.models.user import User
from app.schemas.import_export import ImportPreviewResponse, ImportRowData, ImportRowError
from app.services.audit_service import log_action


# Thai column indices (1-based) based on ROPA_Form.xlsx structure
# Maps to 8 sections of ROPA form per requirements
THAI_COLUMN_MAP = {
    # Section 0: Metadata
    "seq": 1,                          # ลำดับ
    "controller_name": 2,              # 1. ชื่อเจ้าของข้อมูล / ควบคุมข้อมูล / ประมวลผล
    
    # Section 1: Basic Information
    "activity_name": 3,                # 2. กิจกรรมประมวลผล
    "purpose": 4,                      # 3. วัตถุประสงค์ของการประมวลผล
    "personal_data_types": 5,          # 4. ข้อมูลส่วนบุคคลที่จัดเก็บ
    "data_subject_categories": 6,      # 5. หมวดหมู่ของข้อมูล
    "data_type_general": 7,            # 6. ประเภทของข้อมูล (ทั่วไป/ข้อมูลอ่อนไหว)
    
    # Section 2: Data Source
    "data_acquisition_method": 8,      # 7. วิธีการได้มาซึ่งข้อมูล (hard copy/soft file)
    "data_source_direct": 9,           # 8. แหล่งที่ได้มา - จากเจ้าของข้อมูลโดยตรง
    "data_source_other": 10,           # 8. แหล่งที่ได้มา - จากแหล่งอื่น
    
    # Section 3: Legal Basis
    "legal_basis_thai": 11,            # 9. ฐานในการประมวลผล (ตาม PDPA)
    
    # Section 4: Minor Consent
    "minor_consent_under_10": 12,      # 10. การขอความยินยอม - อายุไม่เกิน 10 ปี
    "minor_consent_10_20": 13,         # 10. การขอความยินยอม - อายุ 10-20 ปี
    
    # Section 5: Cross-Border Transfer
    "cross_border_transfer": 14,       # 11. ส่งหรือโอนต่างประเทศ (Y/N)
    "cross_border_affiliate": 15,      # 11. เป็นการส่งของกลุ่มบริษัท (ชื่อบริษัท)
    "cross_border_method": 16,         # 11. วิธีการโอนข้อมูล
    "cross_border_standard": 17,       # 11. มาตรฐานการคุ้มครอง (ของประเทศปลายทาง)
    "cross_border_exception": 18,      # 11. ข้อยกเว้นตามมาตรา 28 (เลขที่)
    
    # Section 6: Retention Policy
    "storage_type": 19,                # 12. ประเภทการเก็บรักษา (soft file/hard copy)
    "storage_method": 20,              # 12. วิธีการเก็บรักษา (เข้ารหัส/ใส่แฟ้ม/etc)
    
    # Extended columns for remaining fields (flexible mapping)
    # These columns may or may not exist depending on form version
    "access_rights": 21,               # ผู้ที่มีสิทธิเข้าถึง
    "deletion_method": 22,             # วิธีการลบข้อมูล
    "data_owner": 23,                  # เจ้าของข้อมูล / ผู้รับผิดชอบ
    "third_party_recipients": 24,      # ผู้รับข้อมูลบุคคลที่สาม
    "disclosure_exemption": 25,        # ข้อยกเว้นจากการเปิดเผย
    "rights_refusal": 26,              # การปฏิเสธสิทธิ
    "retention_period": 27,            # ระยะเวลาเก็บรักษา
    "retention_expiry_date": 28,       # วันครบกำหนดเก็บรักษา
    "next_review_date": 29,            # วันรีวิวครั้งต่อไป
    "security_organizational": 30,     # มาตรการเชิงองค์กร
    "security_technical": 31,          # มาตรการเชิงเทคนิค
    "security_physical": 32,           # มาตรการทางกายภาพ
    "security_access_control": 33,     # มาตรการการควบคุมการเข้าถึง
    "security_responsibility": 34,     # ผู้รับผิดชอบด้านความปลอดภัย
    "security_audit": 35,              # การตรวจสอบและติดตาม
}


def _detect_sheet_type(ws: Worksheet) -> str:
    """
    Detect whether a sheet is Controller or Processor.
    Check sheet name and data pattern.
    """
    sheet_name = ws.title.lower()
    if "processor" in sheet_name:
        return "Processor"
    return "Controller"


def _get_cell_value(row, col_idx: int) -> Optional[str]:
    """Get cell value at 1-based column index (col_idx: 1 = column A, 2 = column B)."""
    if col_idx > len(row):
        return None
    cell = row[col_idx - 1]  # Convert to 0-based index
    return _cell_str(cell.value)



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
    row,
    row_number: int,
    sheet_name: str,
    role_type: str,
    lookups: dict,
) -> tuple[Optional[ImportRowData], list[ImportRowError]]:
    """Validate a single row using fixed Thai column positions.
    
    Handles flexible column mapping - if column doesn't exist, treats as None.
    """
    errors: list[ImportRowError] = []

    # Helper to safely get column value (returns None if column out of range)
    def get_col(col_idx: int) -> Optional[str]:
        if col_idx <= len(row):
            return _get_cell_value(row, col_idx)
        return None

    # Extract all values - columns that don't exist return None
    activity_name = get_col(THAI_COLUMN_MAP["activity_name"])
    controller_name = get_col(THAI_COLUMN_MAP["controller_name"])
    purpose = get_col(THAI_COLUMN_MAP["purpose"])
    personal_data_desc = get_col(THAI_COLUMN_MAP["personal_data_types"])
    data_subject_desc = get_col(THAI_COLUMN_MAP["data_subject_categories"])
    data_type_general = get_col(THAI_COLUMN_MAP["data_type_general"])
    data_acq_method = get_col(THAI_COLUMN_MAP["data_acquisition_method"])
    data_src_direct = get_col(THAI_COLUMN_MAP["data_source_direct"])
    data_src_other = get_col(THAI_COLUMN_MAP["data_source_other"])
    legal_basis = get_col(THAI_COLUMN_MAP["legal_basis_thai"])
    minor_under_10 = get_col(THAI_COLUMN_MAP["minor_consent_under_10"])
    minor_10_20 = get_col(THAI_COLUMN_MAP["minor_consent_10_20"])
    cross_border_str = get_col(THAI_COLUMN_MAP["cross_border_transfer"])
    cross_border_affiliate = get_col(THAI_COLUMN_MAP["cross_border_affiliate"])
    cross_border_method = get_col(THAI_COLUMN_MAP["cross_border_method"])
    cross_border_std = get_col(THAI_COLUMN_MAP["cross_border_standard"])
    cross_border_exc = get_col(THAI_COLUMN_MAP["cross_border_exception"])
    storage_type = get_col(THAI_COLUMN_MAP["storage_type"])
    storage_method = get_col(THAI_COLUMN_MAP["storage_method"])
    
    # Extended fields (Section 6, 7, 8)
    access_rights = get_col(THAI_COLUMN_MAP["access_rights"])
    deletion_method = get_col(THAI_COLUMN_MAP["deletion_method"])
    data_owner = get_col(THAI_COLUMN_MAP["data_owner"])
    third_party_recipients = get_col(THAI_COLUMN_MAP["third_party_recipients"])
    disclosure_exemption = get_col(THAI_COLUMN_MAP["disclosure_exemption"])
    rights_refusal = get_col(THAI_COLUMN_MAP["rights_refusal"])
    retention_period = get_col(THAI_COLUMN_MAP["retention_period"])
    retention_expiry_date_raw = row[THAI_COLUMN_MAP["retention_expiry_date"] - 1] if THAI_COLUMN_MAP["retention_expiry_date"] <= len(row) else None
    next_review_date_raw = row[THAI_COLUMN_MAP["next_review_date"] - 1] if THAI_COLUMN_MAP["next_review_date"] <= len(row) else None
    security_org = get_col(THAI_COLUMN_MAP["security_organizational"])
    security_tech = get_col(THAI_COLUMN_MAP["security_technical"])
    security_phys = get_col(THAI_COLUMN_MAP["security_physical"])
    security_access = get_col(THAI_COLUMN_MAP["security_access_control"])
    security_resp = get_col(THAI_COLUMN_MAP["security_responsibility"])
    security_audit = get_col(THAI_COLUMN_MAP["security_audit"])

    # Validate required fields
    if not activity_name:
        errors.append(ImportRowError(
            sheet_name=sheet_name, row_number=row_number,
            field_name="activity_name", error_reason="กิจกรรมประมวลผล (column 3) is required",
        ))

    # Department lookup: Try to infer from controller name or set to None
    # In flexible mode, department is optional for import (can be assigned later)
    department_id = None

    # Parse cross_border_transfer as boolean
    cross_border_transfer = None
    if cross_border_str:
        if "มี" in cross_border_str or "yes" in cross_border_str.lower() or "ü" in cross_border_str or "✓" in cross_border_str:
            cross_border_transfer = True
        elif "ไม่" in cross_border_str or "no" in cross_border_str.lower():
            cross_border_transfer = False

    # Detect controller/processor
    controller_id = None
    processor_id = None
    
    if role_type == "Controller" and controller_name:
        ctrl = lookups["ctrl_by_name"].get(controller_name.lower())
        if ctrl:
            controller_id = ctrl.id
        # In flexible mode, don't error if controller not found - log as warning
    elif role_type == "Processor" and controller_name:
        proc = lookups["proc_by_name"].get(controller_name.lower())
        if proc:
            processor_id = proc.id

    # Parse data subject categories (comma-separated or using Thai text)
    ds_ids: list[int] = []
    if data_subject_desc:
        categories = ["พนักงาน", "ลูกค้า", "คู่ค้า", "ผู้ติดต่อ", "ผู้สมัคร", "สมาชิก", "อื่น"]
        for cat in categories:
            if cat in data_subject_desc:
                ds = lookups["ds_by_name"].get(cat.lower())
                if ds:
                    ds_ids.append(ds.id)

    # Parse personal data types (comma-separated or using Thai text)
    pdt_ids: list[int] = []
    if personal_data_desc:
        pdt_keywords = ["ชื่อ", "นามสกุล", "เบอร์โทร", "อีเมล", "ที่อยู่", "เลขประจำตัว", 
                       "ข้อมูลธนาคาร", "วันเดือนปี", "บัญชี", "บัตร", "รหัส", "สุขภาพ", 
                       "ศาสนา", "ประวัติ", "ภาพถ่าย", "ลายนิ้วมือ"]
        for keyword in pdt_keywords:
            if keyword in personal_data_desc:
                pdt = lookups["pdt_by_name"].get(keyword.lower())
                if pdt:
                    pdt_ids.append(pdt.id)

    # Parse date fields
    retention_expiry_date = None
    if retention_expiry_date_raw is not None:
        retention_expiry_date = _parse_date(retention_expiry_date_raw.value if hasattr(retention_expiry_date_raw, 'value') else retention_expiry_date_raw)

    next_review_date = None
    if next_review_date_raw is not None:
        next_review_date = _parse_date(next_review_date_raw.value if hasattr(next_review_date_raw, 'value') else next_review_date_raw)

    if errors:
        return None, errors

    row_data = ImportRowData(
        sheet_name=sheet_name,
        row_number=row_number,
        role_type=role_type,
        department_id=department_id,
        controller_id=controller_id,
        processor_id=processor_id,
        data_subject_category_ids=ds_ids,
        personal_data_type_ids=pdt_ids,
        activity_name=activity_name,
        purpose=purpose,
        risk_level=None,  # Not directly from form - can be inferred/set later
        data_acquisition_method=data_acq_method,
        data_source_direct=data_src_direct,
        data_source_other=data_src_other,
        legal_basis_thai=legal_basis,
        minor_consent_under_10=minor_under_10,
        minor_consent_10_20=minor_10_20,
        cross_border_transfer=cross_border_transfer,
        cross_border_affiliate=cross_border_affiliate,
        cross_border_method=cross_border_method,
        cross_border_standard=cross_border_std,
        cross_border_exception=cross_border_exc,
        retention_period=retention_period,
        retention_expiry_date=retention_expiry_date,
        next_review_date=next_review_date,
        storage_type=storage_type,
        storage_method=storage_method,
        access_rights=access_rights,
        deletion_method=deletion_method,
        data_owner=data_owner,
        third_party_recipients=third_party_recipients,
        disclosure_exemption=disclosure_exemption,
        rights_refusal=rights_refusal,
        security_organizational=security_org,
        security_technical=security_tech,
        security_physical=security_phys,
        security_access_control=security_access,
        security_responsibility=security_resp,
        security_audit=security_audit,
    )
    return row_data, []


def _parse_sheet(
    ws: Worksheet,
    sheet_name: str,
    lookups: dict,
) -> tuple[list[ImportRowData], list[ImportRowError]]:
    """Parse a Thai ROPA form worksheet.
    
    Thai form structure:
    - Rows 1-4+ are headers (varying by sheet)
    - Data rows start after headers
    - Find first data row by looking for sequence number in column 1
    """
    rows = list(ws.iter_rows(values_only=False))
    if not rows:
        return [], []

    role_type = _detect_sheet_type(ws)

    valid_rows: list[ImportRowData] = []
    all_errors: list[ImportRowError] = []

    # Find the first data row (skip headers by looking for numeric sequence number in column 1)
    first_data_row = None
    for row_idx, row in enumerate(rows):
        if row_idx < 3:  # Skip first 3 rows (definitely headers)
            continue
        
        seq_cell = row[0] if len(row) > 0 else None
        if seq_cell and seq_cell.value is not None:
            # Try to convert to int to find row with sequence number
            try:
                int(seq_cell.value)
                first_data_row = row_idx
                break
            except (ValueError, TypeError):
                continue
    
    # If no sequence number found, start from row 5 (0-indexed row 4)
    if first_data_row is None:
        first_data_row = 4

    # Parse data rows
    for row_idx, row in enumerate(rows[first_data_row:], start=first_data_row + 1):
        # Check if row has any data in key columns
        seq_val = _get_cell_value(row, THAI_COLUMN_MAP["seq"])
        activity_val = _get_cell_value(row, THAI_COLUMN_MAP["activity_name"])
        
        if not seq_val and not activity_val:
            continue  # Skip empty rows

        parsed, errors = _validate_row(row, row_idx, sheet_name, role_type, lookups)
        if parsed:
            valid_rows.append(parsed)
        all_errors.extend(errors)

    return valid_rows, all_errors


def preview_import(db: Session, file_content: bytes) -> ImportPreviewResponse:
    """Parse a Thai ROPA form Excel file and return a preview with valid rows and errors."""
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
        
        # Count data rows by looking for rows with sequence numbers
        for row in ws.iter_rows(values_only=True):
            if row and row[0] is not None:
                try:
                    int(row[0])
                    total_rows += 1
                except (ValueError, TypeError):
                    continue

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
    target_department_id: Optional[int] = None,
) -> ImportBatch:
    """
    Re-parse the file and import only valid rows, creating ROPA records.
    
    Args:
        db: Database session
        file_content: Excel file bytes
        filename: Original filename
        user_id: User performing import
        target_department_id: Explicit department ID to use (overrides inference)
    
    Raises:
        ValueError: If department_id cannot be determined for import
    """
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

    # Determine default department for rows without one
    default_dept_id = None
    
    # Priority 1: Explicit target department
    if target_department_id:
        default_dept_id = target_department_id
    # Priority 2: Current user's department
    else:
        current_user = db.query(User).filter(User.id == user_id).first()
        if current_user and current_user.department_id:
            default_dept_id = current_user.department_id
    
    # Ensure we have a department to use
    if not default_dept_id:
        raise ValueError(
            "ไม่สามารถระบุแผนกสำหรับการนำเข้าได้\n\n"
            "กรุณาระบุ department_id ในการร้องขอ หรือ\n"
            "ตั้งค่า department ให้กับผู้ใช้ที่ทำการนำเข้า\n\n"
            "คำแนะนำ: POST /api/import/confirm?department_id=1 -F file=@form.xlsx"
        )

    for row in all_valid:
        # Use row's department if available, otherwise use default
        dept_id = row.department_id or default_dept_id

        record = RopaRecord(
            department_id=dept_id,
            created_by=user_id,
            role_type=row.role_type,
            status="pending_approval",  # Always start as pending approval per requirements
            is_deleted=False,  # Newly imported records are not deleted
            controller_id=row.controller_id,
            processor_id=row.processor_id,
            # Section 1: Basic Information
            activity_name=row.activity_name,
            purpose=row.purpose,
            risk_level=row.risk_level,
            # Section 2: Data Source
            data_acquisition_method=row.data_acquisition_method,
            data_source_direct=row.data_source_direct,
            data_source_other=row.data_source_other,
            # Section 3: Legal Basis
            legal_basis_thai=row.legal_basis_thai,
            # Section 4: Minor Consent (not applicable for Processor)
            minor_consent_under_10=row.minor_consent_under_10 if row.role_type == "Controller" else None,
            minor_consent_10_20=row.minor_consent_10_20 if row.role_type == "Controller" else None,
            # Section 5: Cross-Border Transfer
            cross_border_transfer=row.cross_border_transfer,
            cross_border_affiliate=row.cross_border_affiliate,
            cross_border_method=row.cross_border_method,
            cross_border_standard=row.cross_border_standard,
            cross_border_exception=row.cross_border_exception,
            # Section 6: Retention Policy
            retention_period=row.retention_period,
            retention_expiry_date=row.retention_expiry_date,
            next_review_date=row.next_review_date,
            storage_type=row.storage_type,
            storage_method=row.storage_method,
            access_rights=row.access_rights,
            deletion_method=row.deletion_method,
            # Section 7: Data Usage/Disclosure
            data_owner=row.data_owner,
            third_party_recipients=row.third_party_recipients,
            disclosure_exemption=row.disclosure_exemption,
            rights_refusal=row.rights_refusal,
            # Section 8: Security Measures
            security_organizational=row.security_organizational,
            security_technical=row.security_technical,
            security_physical=row.security_physical,
            security_access_control=row.security_access_control,
            security_responsibility=row.security_responsibility,
            security_audit=row.security_audit,
        )
        db.add(record)
        db.flush()

        # Link many-to-many relationships (deduplicate IDs)
        for ds_id in set(row.data_subject_category_ids):
            db.add(RopaDataSubject(ropa_record_id=record.id, data_subject_category_id=ds_id))
        
        for pdt_id in set(row.personal_data_type_ids):
            db.add(RopaPersonalDataType(ropa_record_id=record.id, personal_data_type_id=pdt_id))

        # Create initial version record (version 1)
        db.add(RecordVersion(
            ropa_record_id=record.id,
            version_number=1,
            changed_by=user_id,
            change_reason="Imported from Excel file",
            snapshot={
                "activity_name": record.activity_name,
                "purpose": record.purpose,
                "role_type": record.role_type,
                "status": record.status,
            },
        ))

        rows_success += 1

    # Commit all changes
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise e

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
        reason=f"Imported {rows_success} ROPA records from {filename}" + 
               (f" ({rows_failed} errors)" if rows_failed > 0 else ""),
    )

    db.commit()
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
