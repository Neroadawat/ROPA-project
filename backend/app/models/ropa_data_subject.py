from sqlalchemy import Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class RopaDataSubject(Base):
    __tablename__ = "ropa_data_subjects"

    ropa_record_id: Mapped[int] = mapped_column(Integer, ForeignKey("ropa_records.id"), primary_key=True)
    data_subject_category_id: Mapped[int] = mapped_column(Integer, ForeignKey("data_subject_categories.id"), primary_key=True)
