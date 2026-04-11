from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.user_session_log import UserSessionLog
from app.schemas.auth import LoginRequest, LoginResponse, ChangePasswordRequest
from app.schemas.user import UserResponse
from app.services.auth_service import verify_password, create_access_token, hash_password

router = APIRouter()


@router.post("/login", response_model=LoginResponse)
def login(body: LoginRequest, request: Request, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="อีเมลหรือรหัสผ่านไม่ถูกต้อง")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="บัญชีถูกปิดการใช้งาน")

    token = create_access_token({"user_id": user.id, "email": user.email, "role": user.role})

    # Log session
    session_log = UserSessionLog(user_id=user.id, action="login", ip_address=request.client.host if request.client else None)
    db.add(session_log)
    db.commit()

    return LoginResponse(access_token=token, user=UserResponse.model_validate(user))


@router.post("/logout")
def logout(request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    session_log = UserSessionLog(user_id=current_user.id, action="logout", ip_address=request.client.host if request.client else None)
    db.add(session_log)
    db.commit()
    return {"message": "ออกจากระบบสำเร็จ"}


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)


@router.put("/change-password")
def change_password(body: ChangePasswordRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not verify_password(body.current_password, current_user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="รหัสผ่านปัจจุบันไม่ถูกต้อง")
    current_user.hashed_password = hash_password(body.new_password)
    db.commit()
    return {"message": "เปลี่ยนรหัสผ่านสำเร็จ"}
