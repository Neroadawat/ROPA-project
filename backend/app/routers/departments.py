from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_admin
from app.models.user import User
from app.schemas.department import DepartmentCreate, DepartmentUpdate, DepartmentResponse
from app.services import department_service

router = APIRouter()


@router.get("", response_model=dict)
def list_departments(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    result = department_service.list_departments(db, page=page, per_page=per_page)
    result["items"] = [DepartmentResponse.model_validate(d) for d in result["items"]]
    return result


@router.post("", response_model=DepartmentResponse, status_code=status.HTTP_201_CREATED)
def create_department(
    body: DepartmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    dept = department_service.create_department(db, body)
    return DepartmentResponse.model_validate(dept)


@router.put("/{department_id}", response_model=DepartmentResponse)
def update_department(
    department_id: int,
    body: DepartmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    dept = department_service.update_department(db, department_id, body)
    return DepartmentResponse.model_validate(dept)


@router.delete("/{department_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_department(
    department_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    department_service.delete_department(db, department_id)
