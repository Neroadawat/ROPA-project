from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


# --- Nested response schemas for related entities ---

class DataSubjectCategoryBrief(BaseModel):
    id: int
    name: str

    model_config = ConfigDict(from_attributes=True)


class PersonalDataTypeBrief(BaseModel):
    id: int
    name: str
    category: Optional[str] = None
    sensitivity_level: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ControllerBrief(BaseModel):
    id: int
    name: str

    model_config = ConfigDict(from_attributes=True)


class ProcessorBrief(BaseModel):
    id: int
    name: str
    source_controller_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class UserBrief(BaseModel):
    id: int
    name: str
    email: str

    model_config = ConfigDict(from_attributes=True)


class DepartmentBrief(BaseModel):
    id: int
    name: str
    code: str

    model_config = ConfigDict(from_attributes=True)


# --- Create schema ---

class RopaRecordCreate(BaseModel):
    """Schema for creating a new ROPA record. All 8 sections + relations."""

    # Required fields
    department_id: int
    role_type: str  # "Controller" | "Processor"

    # Controller/Processor reference
    controller_id: Optional[int] = None
    processor_id: Optional[int] = None

    # Junction table IDs
    data_subject_category_ids: list[int] = []
    personal_data_type_ids: list[int] = []

    # Section 1: Activity & Purpose
    activity_name: Optional[str] = None
    purpose: Optional[str] = None
    risk_level: Optional[str] = None  # "Low" | "Medium" | "High"

    # Section 2: Data Acquisition
    data_acquisition_method: Optional[str] = None
    data_source_direct: Optional[str] = None
    data_source_other: Optional[str] = None

    # Section 3: Legal Basis
    legal_basis_thai: Optional[str] = None
    minor_consent_under_10: Optional[str] = None
    minor_consent_10_20: Optional[str] = None

    # Section 4: Cross-border Transfer
    cross_border_transfer: Optional[bool] = None
    cross_border_affiliate: Optional[str] = None
    cross_border_method: Optional[str] = None
    cross_border_standard: Optional[str] = None
    cross_border_exception: Optional[str] = None

    # Section 5: Retention & Storage
    retention_period: Optional[str] = None
    retention_expiry_date: Optional[date] = None
    next_review_date: Optional[date] = None
    storage_type: Optional[str] = None
    storage_method: Optional[str] = None
    access_rights: Optional[str] = None
    deletion_method: Optional[str] = None

    # Section 6: Data Owner & Third Party
    data_owner: Optional[str] = None
    third_party_recipients: Optional[str] = None
    disclosure_exemption: Optional[str] = None
    rights_refusal: Optional[str] = None

    # Section 7: Security Measures
    security_organizational: Optional[str] = None
    security_technical: Optional[str] = None
    security_physical: Optional[str] = None
    security_access_control: Optional[str] = None
    security_responsibility: Optional[str] = None
    security_audit: Optional[str] = None

    # Reason (optional for create)
    reason: Optional[str] = None


# --- Update schema ---

class RopaRecordUpdate(BaseModel):
    """Schema for updating a ROPA record. Same fields as Create but reason is required."""

    role_type: Optional[str] = None
    controller_id: Optional[int] = None
    processor_id: Optional[int] = None

    data_subject_category_ids: Optional[list[int]] = None
    personal_data_type_ids: Optional[list[int]] = None

    # Section 1: Activity & Purpose
    activity_name: Optional[str] = None
    purpose: Optional[str] = None
    risk_level: Optional[str] = None

    # Section 2: Data Acquisition
    data_acquisition_method: Optional[str] = None
    data_source_direct: Optional[str] = None
    data_source_other: Optional[str] = None

    # Section 3: Legal Basis
    legal_basis_thai: Optional[str] = None
    minor_consent_under_10: Optional[str] = None
    minor_consent_10_20: Optional[str] = None

    # Section 4: Cross-border Transfer
    cross_border_transfer: Optional[bool] = None
    cross_border_affiliate: Optional[str] = None
    cross_border_method: Optional[str] = None
    cross_border_standard: Optional[str] = None
    cross_border_exception: Optional[str] = None

    # Section 5: Retention & Storage
    retention_period: Optional[str] = None
    retention_expiry_date: Optional[date] = None
    next_review_date: Optional[date] = None
    storage_type: Optional[str] = None
    storage_method: Optional[str] = None
    access_rights: Optional[str] = None
    deletion_method: Optional[str] = None

    # Section 6: Data Owner & Third Party
    data_owner: Optional[str] = None
    third_party_recipients: Optional[str] = None
    disclosure_exemption: Optional[str] = None
    rights_refusal: Optional[str] = None

    # Section 7: Security Measures
    security_organizational: Optional[str] = None
    security_technical: Optional[str] = None
    security_physical: Optional[str] = None
    security_access_control: Optional[str] = None
    security_responsibility: Optional[str] = None
    security_audit: Optional[str] = None

    # Reason (required for update)
    reason: str


# --- Full response schema (single record detail) ---

class RopaRecordResponse(BaseModel):
    """Full ROPA record response with all related entities."""

    id: int
    department_id: int
    department: DepartmentBrief
    created_by: int
    creator: UserBrief
    role_type: str
    status: str
    rejection_reason: Optional[str] = None
    approved_by: Optional[int] = None
    approver: Optional[UserBrief] = None
    approved_at: Optional[datetime] = None
    is_deleted: bool

    controller_id: Optional[int] = None
    controller: Optional[ControllerBrief] = None
    processor_id: Optional[int] = None
    processor: Optional[ProcessorBrief] = None

    data_subjects: list[DataSubjectCategoryBrief] = []
    personal_data_types: list[PersonalDataTypeBrief] = []

    # Section 1: Activity & Purpose
    activity_name: Optional[str] = None
    purpose: Optional[str] = None
    risk_level: Optional[str] = None

    # Section 2: Data Acquisition
    data_acquisition_method: Optional[str] = None
    data_source_direct: Optional[str] = None
    data_source_other: Optional[str] = None

    # Section 3: Legal Basis
    legal_basis_thai: Optional[str] = None
    minor_consent_under_10: Optional[str] = None
    minor_consent_10_20: Optional[str] = None

    # Section 4: Cross-border Transfer
    cross_border_transfer: Optional[bool] = None
    cross_border_affiliate: Optional[str] = None
    cross_border_method: Optional[str] = None
    cross_border_standard: Optional[str] = None
    cross_border_exception: Optional[str] = None

    # Section 5: Retention & Storage
    retention_period: Optional[str] = None
    retention_expiry_date: Optional[date] = None
    next_review_date: Optional[date] = None
    storage_type: Optional[str] = None
    storage_method: Optional[str] = None
    access_rights: Optional[str] = None
    deletion_method: Optional[str] = None

    # Section 6: Data Owner & Third Party
    data_owner: Optional[str] = None
    third_party_recipients: Optional[str] = None
    disclosure_exemption: Optional[str] = None
    rights_refusal: Optional[str] = None

    # Section 7: Security Measures
    security_organizational: Optional[str] = None
    security_technical: Optional[str] = None
    security_physical: Optional[str] = None
    security_access_control: Optional[str] = None
    security_responsibility: Optional[str] = None
    security_audit: Optional[str] = None

    # Timestamps
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# --- List response schema (summary for table view) ---

class RopaRecordListResponse(BaseModel):
    """Summary fields for ROPA record table view."""

    id: int
    department: DepartmentBrief
    creator: UserBrief
    role_type: str
    status: str
    activity_name: Optional[str] = None
    risk_level: Optional[str] = None
    legal_basis_thai: Optional[str] = None
    retention_expiry_date: Optional[date] = None
    next_review_date: Optional[date] = None
    is_deleted: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class PaginatedRopaRecordList(BaseModel):
    """Paginated list of ROPA records."""

    items: list[RopaRecordListResponse]
    total: int
    page: int
    per_page: int
    pages: int


# --- Approval schemas ---

class ApproveRequest(BaseModel):
    """Request body for approving a ROPA record (no fields required)."""
    pass


class RejectRequest(BaseModel):
    """Request body for rejecting a ROPA record."""

    rejection_reason: str


# --- Delete request schema ---

class DeleteRequest(BaseModel):
    """Request body for deleting a ROPA record (reason required)."""

    reason: str


# --- Version schemas ---

class RecordVersionResponse(BaseModel):
    """Response for a single version entry."""

    id: int
    ropa_record_id: int
    version_number: int
    snapshot: dict
    changed_by: int
    changer: UserBrief
    change_reason: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class VersionChange(BaseModel):
    """A single field change between two versions."""

    field: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None


class VersionCompareResponse(BaseModel):
    """Response for comparing two versions."""

    version_1: RecordVersionResponse
    version_2: RecordVersionResponse
    changes: list[VersionChange]
