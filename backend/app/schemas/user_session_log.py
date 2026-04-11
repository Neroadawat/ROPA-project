from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class UserSessionLogResponse(BaseModel):
    id: int
    user_id: int
    action: str
    ip_address: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
