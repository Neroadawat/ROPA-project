from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.controller import Controller
from app.models.ropa_record import RopaRecord
from app.schemas.controller import ControllerCreate, ControllerUpdate
from app.services.audit_service import log_action


def list_controllers(db: Session, page: int = 1, per_page: int = 20, include_inactive: bool = False) -> dict:
    query = db.query(Controller)
    if not include_inactive:
        query = query.filter(Controller.is_active == True)
    total = query.count()
    items = query.offset((page - 1) * per_page).limit(per_page).all()
    return {"items": items, "total": total, "page": page, "per_page": per_page}


def get_controller(db: Session, controller_id: int) -> Controller:
    controller = db.query(Controller).filter(Controller.id == controller_id).first()
    if not controller:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="ไม่พบ Controller")
    return controller


def create_controller(db: Session, data: ControllerCreate, user_id: int) -> Controller:
    controller = Controller(**data.model_dump())
    db.add(controller)
    db.commit()
    db.refresh(controller)
    log_action(db, user_id=user_id, action="create", table_name="controllers", record_id=controller.id,
               new_value=data.model_dump())
    return controller


def update_controller(db: Session, controller_id: int, data: ControllerUpdate, user_id: int) -> Controller:
    controller = get_controller(db, controller_id)
    update_data = data.model_dump(exclude_unset=True)
    old_value = {"name": controller.name, "address": controller.address, "email": controller.email,
                 "phone": controller.phone, "is_active": controller.is_active}
    for key, value in update_data.items():
        setattr(controller, key, value)
    db.commit()
    db.refresh(controller)
    log_action(db, user_id=user_id, action="update", table_name="controllers", record_id=controller.id,
               old_value=old_value, new_value=update_data)
    return controller


def deactivate_controller(db: Session, controller_id: int, user_id: int) -> None:
    controller = get_controller(db, controller_id)
    # Block deactivation if referenced by active ROPA records
    ropa_count = db.query(RopaRecord).filter(
        RopaRecord.controller_id == controller_id,
        RopaRecord.is_deleted == False,
    ).count()
    if ropa_count > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"ไม่สามารถปิดการใช้งาน Controller ได้ เนื่องจากมี ROPA Record อ้างอิงอยู่ {ropa_count} รายการ",
        )
    controller.is_active = False
    db.commit()
    log_action(db, user_id=user_id, action="deactivate", table_name="controllers", record_id=controller.id,
               old_value={"is_active": True}, new_value={"is_active": False})
