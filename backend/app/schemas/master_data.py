from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


# --- DataSubjectCategory ---

class DataSubjectCategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None


class DataSubjectCategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class DataSubjectCategoryResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- PersonalDataType ---

class PersonalDataTypeCreate(BaseModel):
    name: str
    category: Optional[str] = None
    sensitivity_level: Optional[str] = None


class PersonalDataTypeUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    sensitivity_level: Optional[str] = None


class PersonalDataTypeResponse(BaseModel):
    id: int
    name: str
    category: Optional[str] = None
    sensitivity_level: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
