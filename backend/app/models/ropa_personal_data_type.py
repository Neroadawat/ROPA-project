from sqlalchemy import Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class RopaPersonalDataType(Base):
    __tablename__ = "ropa_personal_data_types"

    ropa_record_id: Mapped[int] = mapped_column(Integer, ForeignKey("ropa_records.id"), primary_key=True)
    personal_data_type_id: Mapped[int] = mapped_column(Integer, ForeignKey("personal_data_types.id"), primary_key=True)
