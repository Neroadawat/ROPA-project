from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class ProcessorCreate(BaseModel):
    name: str
    source_controller_id: int
    address: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    data_category: Optional[str] = None


class ProcessorUpdate(BaseModel):
    name: Optional[str] = None
    source_controller_id: Optional[int] = None
    address: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    data_category: Optional[str] = None
    is_active: Optional[bool] = None


class ProcessorResponse(BaseModel):
    id: int
    name: str
    source_controller_id: Optional[int] = None
    address: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    data_category: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
