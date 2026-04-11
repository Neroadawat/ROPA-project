from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.department import Department
from app.schemas.department import DepartmentCreate, DepartmentUpdate


def create_department(db: Session, data: DepartmentCreate) -> Department:
    existing = db.query(Department).filter(Department.code == data.code).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="รหัสแผนกนี้ถูกใช้งานแล้ว")
    dept = Department(name=data.name, code=data.code)
    db.add(dept)
    db.commit()
    db.refresh(dept)
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


def update_department(db: Session, department_id: int, data: DepartmentUpdate) -> Department:
    dept = get_department(db, department_id)
    update_data = data.model_dump(exclude_unset=True)
    if "code" in update_data:
        existing = db.query(Department).filter(Department.code == update_data["code"], Department.id != department_id).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="รหัสแผนกนี้ถูกใช้งานแล้ว")
    for key, value in update_data.items():
        setattr(dept, key, value)
    db.commit()
    db.refresh(dept)
    return dept


def delete_department(db: Session, department_id: int) -> None:
    dept = get_department(db, department_id)
    # Check if department has linked ROPA records (table may not exist yet in Sprint 1)
    # This will be enforced when ropa_records table is created in later sprints
    # For now, just check if there are users linked
    db.delete(dept)
    db.commit()
