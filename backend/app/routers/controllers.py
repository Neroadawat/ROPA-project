from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_admin
from app.models.user import User
from app.schemas.controller import ControllerCreate, ControllerUpdate, ControllerResponse
from app.services import controller_service

router = APIRouter()


@router.get("", response_model=dict)
def list_controllers(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    include_inactive: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    result = controller_service.list_controllers(db, page=page, per_page=per_page, include_inactive=include_inactive)
    result["items"] = [ControllerResponse.model_validate(c) for c in result["items"]]
    return result


@router.post("", response_model=ControllerResponse, status_code=status.HTTP_201_CREATED)
def create_controller(
    body: ControllerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    controller = controller_service.create_controller(db, body, user_id=current_user.id)
    return ControllerResponse.model_validate(controller)


@router.put("/{controller_id}", response_model=ControllerResponse)
def update_controller(
    controller_id: int,
    body: ControllerUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    controller = controller_service.update_controller(db, controller_id, body, user_id=current_user.id)
    return ControllerResponse.model_validate(controller)


@router.delete("/{controller_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_controller(
    controller_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    controller_service.deactivate_controller(db, controller_id, user_id=current_user.id)
