from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.department import Department
from app.schemas.department import DepartmentCreate, DepartmentUpdate
from app.services.audit_service import log_action


def create_department(db: Session, data: DepartmentCreate, user_id: int = None) -> Department:
    existing = db.query(Department).filter(Department.code == data.code).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="รหัสแผนกนี้ถูกใช้งานแล้ว")
    dept = Department(name=data.name, code=data.code)
    db.add(dept)
    db.commit()
    db.refresh(dept)
    if user_id:
        log_action(db, user_id=user_id, action="create", table_name="departments",
                   record_id=dept.id, new_value=data.model_dump())
    return dept


def get_department(db: Session, department_id: int) -> Department:
    dept = db.query(Department).filter(Department.id == department_id).first()
    if not dept:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="ไม่พบแผนก")
    return dept


def list_departments(db: Session, page: int = 1, per_page: int = 20) -> dict:
    query = db.query(Department)
    total = query.count()
    items = query.offset((page - 1) * per_page).limit(per_page).all()
    return {"items": items, "total": total, "page": page, "per_page": per_page}


def update_department(db: Session, department_id: int, data: DepartmentUpdate, user_id: int = None) -> Department:
    dept = get_department(db, department_id)
    update_data = data.model_dump(exclude_unset=True)
    if "code" in update_data:
        existing = db.query(Department).filter(Department.code == update_data["code"], Department.id != department_id).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="รหัสแผนกนี้ถูกใช้งานแล้ว")
    old_value = {"name": dept.name, "code": dept.code}
    for key, value in update_data.items():
        setattr(dept, key, value)
    db.commit()
    db.refresh(dept)
    if user_id:
        log_action(db, user_id=user_id, action="update", table_name="departments",
                   record_id=dept.id, old_value=old_value, new_value=update_data)
    return dept


def delete_department(db: Session, department_id: int, user_id: int = None) -> None:
    dept = get_department(db, department_id)
    dept_id = dept.id
    old_value = {"name": dept.name, "code": dept.code}
    db.delete(dept)
    db.commit()
    if user_id:
        log_action(db, user_id=user_id, action="delete", table_name="departments",
                   record_id=dept_id, old_value=old_value)
