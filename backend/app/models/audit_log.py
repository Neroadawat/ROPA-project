from datetime import datetime
from typing import Optional

from sqlalchemy import String, Integer, DateTime, ForeignKey, JSON, func, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base

# Valid audit log actions
VALID_AUDIT_ACTIONS = [
    "create",
    "update",
    "delete",
    "import",
    "export",
    "approve",
    "approve_delete",
    "reject",
    "deactivate",
]


class AuditLog(Base):
    __tablename__ = "audit_logs"
    __table_args__ = (
        CheckConstraint(
            f"action IN ({', '.join(repr(a) for a in VALID_AUDIT_ACTIONS)})",
            name="audit_logs_action_check",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    action: Mapped[str] = mapped_column(String(50), nullable=False)
    table_name: Mapped[str] = mapped_column(String(100), nullable=False)
    record_id: Mapped[int] = mapped_column(Integer, nullable=False)
    old_value: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    new_value: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    reason: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
