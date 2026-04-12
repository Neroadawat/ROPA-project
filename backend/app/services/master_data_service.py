from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.data_subject_category import DataSubjectCategory
from app.models.personal_data_type import PersonalDataType
from app.schemas.master_data import (
    DataSubjectCategoryCreate,
    DataSubjectCategoryUpdate,
    PersonalDataTypeCreate,
    PersonalDataTypeUpdate,
)
from app.services.audit_service import log_action


# --- DataSubjectCategory ---

def list_data_subject_categories(db: Session, page: int = 1, per_page: int = 20) -> dict:
    query = db.query(DataSubjectCategory)
    total = query.count()
    items = query.offset((page - 1) * per_page).limit(per_page).all()
    return {"items": items, "total": total, "page": page, "per_page": per_page}


def get_data_subject_category(db: Session, category_id: int) -> DataSubjectCategory:
    cat = db.query(DataSubjectCategory).filter(DataSubjectCategory.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="ไม่พบประเภทเจ้าของข้อมูล")
    return cat


def create_data_subject_category(db: Session, data: DataSubjectCategoryCreate, user_id: int) -> DataSubjectCategory:
    existing = db.query(DataSubjectCategory).filter(DataSubjectCategory.name == data.name).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="ชื่อประเภทเจ้าของข้อมูลนี้ถูกใช้งานแล้ว")
    cat = DataSubjectCategory(**data.model_dump())
    db.add(cat)
    db.commit()
    db.refresh(cat)
    log_action(db, user_id=user_id, action="create", table_name="data_subject_categories",
               record_id=cat.id, new_value=data.model_dump())
    return cat


def update_data_subject_category(db: Session, category_id: int, data: DataSubjectCategoryUpdate, user_id: int) -> DataSubjectCategory:
    cat = get_data_subject_category(db, category_id)
    update_data = data.model_dump(exclude_unset=True)
    if "name" in update_data:
        existing = db.query(DataSubjectCategory).filter(
            DataSubjectCategory.name == update_data["name"],
            DataSubjectCategory.id != category_id,
        ).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="ชื่อประเภทเจ้าของข้อมูลนี้ถูกใช้งานแล้ว")
    old_value = {"name": cat.name, "description": cat.description}
    for key, value in update_data.items():
        setattr(cat, key, value)
    db.commit()
    db.refresh(cat)
    log_action(db, user_id=user_id, action="update", table_name="data_subject_categories",
               record_id=cat.id, old_value=old_value, new_value=update_data)
    return cat


def delete_data_subject_category(db: Session, category_id: int, user_id: int) -> None:
    cat = get_data_subject_category(db, category_id)
    log_action(db, user_id=user_id, action="delete", table_name="data_subject_categories",
               record_id=cat.id, old_value={"name": cat.name, "description": cat.description})
    db.delete(cat)
    db.commit()


# --- PersonalDataType ---

def list_personal_data_types(db: Session, page: int = 1, per_page: int = 20) -> dict:
    query = db.query(PersonalDataType)
    total = query.count()
    items = query.offset((page - 1) * per_page).limit(per_page).all()
    return {"items": items, "total": total, "page": page, "per_page": per_page}


def get_personal_data_type(db: Session, type_id: int) -> PersonalDataType:
    pdt = db.query(PersonalDataType).filter(PersonalDataType.id == type_id).first()
    if not pdt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="ไม่พบประเภทข้อมูลส่วนบุคคล")
    return pdt


def create_personal_data_type(db: Session, data: PersonalDataTypeCreate, user_id: int) -> PersonalDataType:
    existing = db.query(PersonalDataType).filter(PersonalDataType.name == data.name).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="ชื่อประเภทข้อมูลส่วนบุคคลนี้ถูกใช้งานแล้ว")
    pdt = PersonalDataType(**data.model_dump())
    db.add(pdt)
    db.commit()
    db.refresh(pdt)
    log_action(db, user_id=user_id, action="create", table_name="personal_data_types",
               record_id=pdt.id, new_value=data.model_dump())
    return pdt


def update_personal_data_type(db: Session, type_id: int, data: PersonalDataTypeUpdate, user_id: int) -> PersonalDataType:
    pdt = get_personal_data_type(db, type_id)
    update_data = data.model_dump(exclude_unset=True)
    if "name" in update_data:
        existing = db.query(PersonalDataType).filter(
            PersonalDataType.name == update_data["name"],
            PersonalDataType.id != type_id,
        ).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="ชื่อประเภทข้อมูลส่วนบุคคลนี้ถูกใช้งานแล้ว")
    old_value = {"name": pdt.name, "category": pdt.category, "sensitivity_level": pdt.sensitivity_level}
    for key, value in update_data.items():
        setattr(pdt, key, value)
    db.commit()
    db.refresh(pdt)
    log_action(db, user_id=user_id, action="update", table_name="personal_data_types",
               record_id=pdt.id, old_value=old_value, new_value=update_data)
    return pdt


def delete_personal_data_type(db: Session, type_id: int, user_id: int) -> None:
    pdt = get_personal_data_type(db, type_id)
    log_action(db, user_id=user_id, action="delete", table_name="personal_data_types",
               record_id=pdt.id, old_value={"name": pdt.name, "category": pdt.category, "sensitivity_level": pdt.sensitivity_level})
    db.delete(pdt)
    db.commit()
