from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class ControllerCreate(BaseModel):
    name: str
    address: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None


class ControllerUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = None


class ControllerResponse(BaseModel):
    id: int
    name: str
    address: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
