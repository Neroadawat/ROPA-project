from datetime import datetime
from typing import Optional

from sqlalchemy import String, Boolean, Integer, DateTime, Text, ForeignKey, JSON, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class AiSuggestionLog(Base):
    __tablename__ = "ai_suggestion_logs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    ropa_record_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("ropa_records.id"), nullable=True)
    input_activity_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    input_purpose: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    suggestions: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    selected_legal_basis: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    accepted: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    model_version: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
