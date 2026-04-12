from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, require_admin
from app.models.user import User
from app.schemas.master_data import (
    DataSubjectCategoryCreate,
    DataSubjectCategoryUpdate,
    DataSubjectCategoryResponse,
    PersonalDataTypeCreate,
    PersonalDataTypeUpdate,
    PersonalDataTypeResponse,
)
from app.services import master_data_service

router = APIRouter()


# --- DataSubjectCategory endpoints ---

@router.get("/data-subject-categories", response_model=dict)
def list_data_subject_categories(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = master_data_service.list_data_subject_categories(db, page=page, per_page=per_page)
    result["items"] = [DataSubjectCategoryResponse.model_validate(c) for c in result["items"]]
    return result


@router.post("/data-subject-categories", response_model=DataSubjectCategoryResponse, status_code=status.HTTP_201_CREATED)
def create_data_subject_category(
    body: DataSubjectCategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    cat = master_data_service.create_data_subject_category(db, body, user_id=current_user.id)
    return DataSubjectCategoryResponse.model_validate(cat)


@router.put("/data-subject-categories/{category_id}", response_model=DataSubjectCategoryResponse)
def update_data_subject_category(
    category_id: int,
    body: DataSubjectCategoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    cat = master_data_service.update_data_subject_category(db, category_id, body, user_id=current_user.id)
    return DataSubjectCategoryResponse.model_validate(cat)


@router.delete("/data-subject-categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_data_subject_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    master_data_service.delete_data_subject_category(db, category_id, user_id=current_user.id)


# --- PersonalDataType endpoints ---

@router.get("/personal-data-types", response_model=dict)
def list_personal_data_types(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = master_data_service.list_personal_data_types(db, page=page, per_page=per_page)
    result["items"] = [PersonalDataTypeResponse.model_validate(p) for p in result["items"]]
    return result


@router.post("/personal-data-types", response_model=PersonalDataTypeResponse, status_code=status.HTTP_201_CREATED)
def create_personal_data_type(
    body: PersonalDataTypeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    pdt = master_data_service.create_personal_data_type(db, body, user_id=current_user.id)
    return PersonalDataTypeResponse.model_validate(pdt)


@router.put("/personal-data-types/{type_id}", response_model=PersonalDataTypeResponse)
def update_personal_data_type(
    type_id: int,
    body: PersonalDataTypeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    pdt = master_data_service.update_personal_data_type(db, type_id, body, user_id=current_user.id)
    return PersonalDataTypeResponse.model_validate(pdt)


@router.delete("/personal-data-types/{type_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_personal_data_type(
    type_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    master_data_service.delete_personal_data_type(db, type_id, user_id=current_user.id)
