from datetime import datetime,date
from typing import Optional

from sqlalchemy import Date, String, Boolean, Integer, DateTime, Text, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class RopaRecord(Base):
    __tablename__ = "ropa_records"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    department_id: Mapped[int] = mapped_column(Integer, ForeignKey("departments.id"), nullable=False)
    created_by: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    controller_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("controllers.id"), nullable=True)
    processor_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("processors.id"), nullable=True)
    role_type: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="pending_approval")
    rejection_reason: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    approved_by: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)

    # Activity & Purpose
    activity_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    purpose: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    risk_level: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # Data Acquisition
    data_acquisition_method: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    data_source_direct: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    data_source_other: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Legal Basis
    legal_basis_thai: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    minor_consent_under_10: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    minor_consent_10_20: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Cross-border Transfer
    cross_border_transfer: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    cross_border_affiliate: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    cross_border_method: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    cross_border_standard: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    cross_border_exception: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Retention & Storage
    retention_period: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    retention_expiry_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)  
    next_review_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)       
    storage_type: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    storage_method: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    access_rights: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    deletion_method: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Data Owner & Third Party
    data_owner: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    third_party_recipients: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    disclosure_exemption: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    rights_refusal: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Security Measures
    security_organizational: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    security_technical: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    security_physical: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    security_access_control: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    security_responsibility: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    security_audit: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    department = relationship("Department", back_populates="ropa_records")
    creator = relationship("User", foreign_keys=[created_by], back_populates="created_ropa_records")
    controller = relationship("Controller", back_populates="ropa_records")
    processor = relationship("Processor", back_populates="ropa_records")
    approver = relationship("User", foreign_keys=[approved_by], back_populates="approved_ropa_records")
    data_subjects = relationship("DataSubjectCategory", secondary="ropa_data_subjects", backref="ropa_records")
    personal_data_types = relationship("PersonalDataType", secondary="ropa_personal_data_types", backref="ropa_records")
    versions = relationship("RecordVersion", back_populates="ropa_record", order_by="RecordVersion.version_number.desc()")
