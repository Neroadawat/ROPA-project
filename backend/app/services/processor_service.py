from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.controller import Controller
from app.models.processor import Processor
from app.models.ropa_record import RopaRecord
from app.schemas.processor import ProcessorCreate, ProcessorUpdate
from app.services.audit_service import log_action


def list_processors(db: Session, page: int = 1, per_page: int = 20, include_inactive: bool = False) -> dict:
    query = db.query(Processor)
    if not include_inactive:
        query = query.filter(Processor.is_active == True)
    total = query.count()
    items = query.offset((page - 1) * per_page).limit(per_page).all()
    return {"items": items, "total": total, "page": page, "per_page": per_page}


def get_processor(db: Session, processor_id: int) -> Processor:
    processor = db.query(Processor).filter(Processor.id == processor_id).first()
    if not processor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="ไม่พบ Processor")
    return processor


def create_processor(db: Session, data: ProcessorCreate, user_id: int) -> Processor:
    # Validate source_controller_id exists
    controller = db.query(Controller).filter(Controller.id == data.source_controller_id).first()
    if not controller:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="ไม่พบ Controller ที่อ้างอิง")
    processor = Processor(**data.model_dump())
    db.add(processor)
    db.commit()
    db.refresh(processor)
    log_action(db, user_id=user_id, action="create", table_name="processors", record_id=processor.id,
               new_value=data.model_dump())
    return processor


def update_processor(db: Session, processor_id: int, data: ProcessorUpdate, user_id: int) -> Processor:
    processor = get_processor(db, processor_id)
    update_data = data.model_dump(exclude_unset=True)
    # Validate source_controller_id if provided
    if "source_controller_id" in update_data and update_data["source_controller_id"] is not None:
        controller = db.query(Controller).filter(Controller.id == update_data["source_controller_id"]).first()
        if not controller:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="ไม่พบ Controller ที่อ้างอิง")
    old_value = {
        "name": processor.name, "address": processor.address, "email": processor.email,
        "phone": processor.phone, "source_controller_id": processor.source_controller_id,
        "data_category": processor.data_category, "is_active": processor.is_active,
    }
    for key, value in update_data.items():
        setattr(processor, key, value)
    db.commit()
    db.refresh(processor)
    log_action(db, user_id=user_id, action="update", table_name="processors", record_id=processor.id,
               old_value=old_value, new_value=update_data)
    return processor


def deactivate_processor(db: Session, processor_id: int, user_id: int) -> None:
    processor = get_processor(db, processor_id)
    # Block deactivation if referenced by active ROPA records
    ropa_count = db.query(RopaRecord).filter(
        RopaRecord.processor_id == processor_id,
        RopaRecord.is_deleted == False,
    ).count()
    if ropa_count > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"ไม่สามารถปิดการใช้งาน Processor ได้ เนื่องจากมี ROPA Record อ้างอิงอยู่ {ropa_count} รายการ",
        )
    processor.is_active = False
    db.commit()
    log_action(db, user_id=user_id, action="deactivate", table_name="processors", record_id=processor.id,
               old_value={"is_active": True}, new_value={"is_active": False})
