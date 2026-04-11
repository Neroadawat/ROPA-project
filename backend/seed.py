"""
Seed script: drops all tables, recreates them, then seeds initial data.
Run with: python seed.py (from backend/ directory)
"""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from app.database import engine, SessionLocal, Base
from app.models.department import Department
from app.models.user import User
from app.models.audit_log import AuditLog
from app.models.user_session_log import UserSessionLog
from app.services.auth_service import hash_password

ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@triangle.com")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123456")

DEPARTMENTS = [
    {"name": "IT", "code": "IT"},
    {"name": "HR", "code": "HR"},
    {"name": "Finance", "code": "FIN"},
    {"name": "Legal", "code": "LEG"},
]


def seed():
    # Drop all tables using raw SQL CASCADE to handle foreign keys from other tables
    print("Dropping all tables (CASCADE)...")
    with engine.connect() as conn:
        conn.execute(
            __import__('sqlalchemy').text(
                "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
            )
        )
        conn.commit()
    print("Creating all tables...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        for dept_data in DEPARTMENTS:
            db.add(Department(**dept_data))
            print(f"Created department: {dept_data['name']}")
        db.commit()

        admin = User(
            email=ADMIN_EMAIL,
            hashed_password=hash_password(ADMIN_PASSWORD),
            name="Admin",
            role="Admin",
            is_active=True,
        )
        db.add(admin)
        db.commit()
        print(f"Created admin user: {ADMIN_EMAIL}")

        print("Seed completed successfully!")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
