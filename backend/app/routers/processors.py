from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, require_admin
from app.models.user import User
from app.schemas.processor import ProcessorCreate, ProcessorUpdate, ProcessorResponse
from app.services import processor_service

router = APIRouter()


@router.get("", response_model=dict)
def list_processors(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    include_inactive: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = processor_service.list_processors(db, page=page, per_page=per_page, include_inactive=include_inactive)
    result["items"] = [ProcessorResponse.model_validate(p) for p in result["items"]]
    return result


@router.post("", response_model=ProcessorResponse, status_code=status.HTTP_201_CREATED)
def create_processor(
    body: ProcessorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    processor = processor_service.create_processor(db, body, user_id=current_user.id)
    return ProcessorResponse.model_validate(processor)


@router.put("/{processor_id}", response_model=ProcessorResponse)
def update_processor(
    processor_id: int,
    body: ProcessorUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    processor = processor_service.update_processor(db, processor_id, body, user_id=current_user.id)
    return ProcessorResponse.model_validate(processor)


@router.delete("/{processor_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_processor(
    processor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    processor_service.deactivate_processor(db, processor_id, user_id=current_user.id)
