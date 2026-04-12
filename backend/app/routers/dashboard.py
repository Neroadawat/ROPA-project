"""Dashboard router — analytics and summary endpoints."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.services import dashboard_service

router = APIRouter()


@router.get("/summary")
def dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return dashboard_service.get_summary(db, current_user)


@router.get("/completeness")
def dashboard_completeness(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return dashboard_service.get_completeness(db, current_user)


@router.get("/trends")
def dashboard_trends(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return dashboard_service.get_trends(db, current_user)


@router.get("/risk-heatmap")
def dashboard_risk_heatmap(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return dashboard_service.get_risk_heatmap(db, current_user)


@router.get("/compliance-scores")
def dashboard_compliance_scores(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return dashboard_service.get_compliance_scores(db, current_user)


@router.get("/status-overview")
def dashboard_status_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return dashboard_service.get_status_overview(db, current_user)


@router.get("/sensitive-data-mapping")
def dashboard_sensitive_data_mapping(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return dashboard_service.get_sensitive_data_mapping(db, current_user)


@router.get("/retention-alerts")
def dashboard_retention_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return dashboard_service.get_retention_alerts_summary(db, current_user)
