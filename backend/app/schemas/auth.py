from typing import Optional

from pydantic import BaseModel

from app.schemas.user import UserResponse


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class TokenData(BaseModel):
    user_id: int
    email: str
    role: str
