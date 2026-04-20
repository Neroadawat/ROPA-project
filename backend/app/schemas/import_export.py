from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class ControllerProcessorOption(BaseModel):
    """Option for controller or processor."""
    id: int
    name: str
    type: str  # "controller" or "processor"
    is_active: bool
    address: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None


class ImportRowError(BaseModel):
    """A single validation error for an import row."""
    sheet_name: str
    row_number: int
    field_name: str
    error_reason: str


class ImportRowData(BaseModel):
    """Parsed and validated data for a single import row."""
    sheet_name: str
    row_number: int
    role_type: str
    department_id: Optional[int] = None
    controller_id: Optional[int] = None
    processor_id: Optional[int] = None

    controller_name: Optional[str] = None
    processor_name: Optional[str] = None

    # Duplicate detection
    is_duplicate: bool = False
    duplicate_record_id: Optional[int] = None

    # raw values from Excel
    excel_address: Optional[str] = None
    excel_personal_data_types: Optional[str] = None
    excel_data_subject_categories: Optional[str] = None
    excel_data_type_general: Optional[str] = None

    # matched data from database
    controller_address: Optional[str] = None
    controller_email: Optional[str] = None
    controller_phone: Optional[str] = None
    processor_address: Optional[str] = None
    processor_email: Optional[str] = None
    processor_phone: Optional[str] = None

    data_subject_category_ids: list[int] = []
    personal_data_type_ids: list[int] = []

    # Section 1: Basic Information
    activity_name: Optional[str] = None
    purpose: Optional[str] = None
    risk_level: Optional[str] = None

    # Section 2: Data Source
    data_acquisition_method: Optional[str] = None
    data_source_direct: Optional[str] = None
    data_source_other: Optional[str] = None

    # Section 3: Legal Basis
    legal_basis_thai: Optional[str] = None
    legal_basis_gdpr: Optional[str] = None

    # Section 4: Minor Consent
    minor_consent_under_10: Optional[str] = None
    minor_consent_10_20: Optional[str] = None

    # Section 5: Cross-Border Transfer
    cross_border_transfer: Optional[bool] = None
    cross_border_affiliate: Optional[str] = None
    cross_border_method: Optional[str] = None
    cross_border_standard: Optional[str] = None
    cross_border_exception: Optional[str] = None

    # Section 6: Retention & Storage
    retention_period: Optional[str] = None
    storage_type: Optional[str] = None
    storage_method: Optional[str] = None
    access_rights: Optional[str] = None
    deletion_method: Optional[str] = None

    # Section 7: Data Usage & Disclosure
    data_owner: Optional[str] = None
    third_party_recipients: Optional[str] = None
    disclosure_exemption: Optional[str] = None
    rights_refusal: Optional[str] = None

    # Section 8: Security Measures
    security_organizational: Optional[str] = None
    security_technical: Optional[str] = None
    security_physical: Optional[str] = None
    security_access_control: Optional[str] = None
    security_responsibility: Optional[str] = None
    security_audit: Optional[str] = None


class ImportPreviewResponse(BaseModel):
    """Response from the import preview endpoint."""
    valid_rows: list[ImportRowData]
    errors: list[ImportRowError]
    total_rows: int
    valid_count: int
    error_count: int
    controller_options: list[ControllerProcessorOption] = []
    processor_options: list[ControllerProcessorOption] = []


class ImportConfirmRequest(BaseModel):
    """Request to confirm an import (re-upload the same file)."""
    pass  # File is re-uploaded via form data


class ImportBatchResponse(BaseModel):
    """Response for an import batch record."""
    id: int
    imported_by: int
    filename: str
    rows_success: int
    rows_failed: int
    status: str
    error_details: Optional[dict] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
