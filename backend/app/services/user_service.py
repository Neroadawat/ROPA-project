from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate
from app.services.auth_service import hash_password
from app.services.audit_service import log_action


def create_user(db: Session, user_data: UserCreate, user_id: int = None) -> User:
    existing = db.query(User).filter(User.email == user_data.email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="อีเมลนี้ถูกใช้งานแล้ว")

    user = User(
        email=user_data.email,
        name=user_data.name,
        hashed_password=hash_password(user_data.password),
        role=user_data.role,
        department_id=user_data.department_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    if user_id:
        log_action(db, user_id=user_id, action="create", table_name="users",
                   record_id=user.id, new_value={"email": user.email, "name": user.name, "role": user.role})
    return user


def get_user(db: Session, user_id: int) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="ไม่พบผู้ใช้")
    return user


def list_users(db: Session, page: int = 1, per_page: int = 20, search: Optional[str] = None) -> dict:
    query = db.query(User)
    if search:
        query = query.filter(or_(User.name.ilike(f"%{search}%"), User.email.ilike(f"%{search}%")))
    total = query.count()
    users = query.offset((page - 1) * per_page).limit(per_page).all()
    return {"items": users, "total": total, "page": page, "per_page": per_page}


def update_user(db: Session, target_user_id: int, user_data: UserUpdate, user_id: int = None) -> User:
    user = get_user(db, target_user_id)
    old_value = {"name": user.name, "email": user.email, "role": user.role, "is_active": user.is_active}
    update_data = user_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(user, key, value)
    db.commit()
    db.refresh(user)
    if user_id:
        log_action(db, user_id=user_id, action="update", table_name="users",
                   record_id=user.id, old_value=old_value, new_value=update_data)
    return user


def deactivate_user(db: Session, target_user_id: int, user_id: int = None) -> User:
    user = get_user(db, target_user_id)
    user.is_active = False
    db.commit()
    db.refresh(user)
    if user_id:
        log_action(db, user_id=user_id, action="deactivate", table_name="users",
                   record_id=user.id, old_value={"is_active": True}, new_value={"is_active": False})
    return user
