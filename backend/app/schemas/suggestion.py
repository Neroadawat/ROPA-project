from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict


class SuggestRequest(BaseModel):
    activity_name: str
    purpose: str
    data_categories: Optional[List[str]] = None
    role_type: Optional[str] = None


class SuggestionItem(BaseModel):
    legal_basis: str
    confidence: float
    reasoning: str
    pdpa_section: str
    caution: Optional[str] = None
    matched_keywords: List[str]


class SuggestResponse(BaseModel):
    suggestions: List[SuggestionItem]
    input_summary: str
    engine_version: str
    fallback: bool = False
    detail: Optional[str] = None


class SuggestionLogResponse(BaseModel):
    id: int
    user_id: int
    ropa_record_id: Optional[int] = None
    input_activity_name: Optional[str] = None
    input_purpose: Optional[str] = None
    suggestions: Optional[dict] = None
    selected_legal_basis: Optional[str] = None
    accepted: Optional[bool] = None
    engine_version: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
