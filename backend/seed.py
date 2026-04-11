"""
Seed script: creates initial Admin user and sample departments.
Run with: python -m seed (from backend/ directory)
"""
import os
import sys

# Ensure app package is importable
sys.path.insert(0, os.path.dirname(__file__))

from app.database import SessionLocal
from app.models.department import Department
from app.models.user import User
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
    db = SessionLocal()
    try:
        # Create departments
        for dept_data in DEPARTMENTS:
            existing = db.query(Department).filter(Department.code == dept_data["code"]).first()
            if not existing:
                db.add(Department(**dept_data))
                print(f"Created department: {dept_data['name']}")
            else:
                print(f"Department already exists: {dept_data['name']}")
        db.commit()

        # Create admin user
        existing_admin = db.query(User).filter(User.email == ADMIN_EMAIL).first()
        if not existing_admin:
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
        else:
            print(f"Admin user already exists: {ADMIN_EMAIL}")

        print("Seed completed successfully!")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
