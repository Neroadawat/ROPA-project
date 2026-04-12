from datetime import datetime
from typing import Optional

from sqlalchemy import Integer, DateTime, Text, ForeignKey, JSON, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class RecordVersion(Base):
    __tablename__ = "record_versions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    ropa_record_id: Mapped[int] = mapped_column(Integer, ForeignKey("ropa_records.id"), nullable=False, index=True)
    version_number: Mapped[int] = mapped_column(Integer, nullable=False)
    snapshot: Mapped[dict] = mapped_column(JSON, nullable=False)
    changed_by: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    change_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    ropa_record = relationship("RopaRecord", back_populates="versions")
    changer = relationship("User", back_populates="record_versions")
