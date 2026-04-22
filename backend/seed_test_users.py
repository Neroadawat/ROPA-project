"""
Seed script สำหรับ CI/CD testing
สร้าง test users ที่จำเป็นสำหรับ Robot Framework tests
"""
import os
import sys

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, create_tables
from app.models.user import User
from app.services.auth_service import hash_password

TEST_USERS = [
    {
        "email": "admin@triangle.com",
        "password": "admin123456",
        "name": "Admin User",
        "role": "Admin",
    },
    {
        "email": "dpo@triangle.com",
        "password": "dpo123456",
        "name": "DPO User",
        "role": "DPO",
    },
    {
        "email": "dept@triangle.com",
        "password": "dept123456",
        "name": "Department User",
        "role": "Department_User",
    },
    {
        "email": "auditor@triangle.com",
        "password": "auditor123456",
        "name": "Auditor User",
        "role": "Viewer_Auditor",
    },
]


def seed():
    print("Creating tables...")
    create_tables()

    db = SessionLocal()
    try:
        for u in TEST_USERS:
            existing = db.query(User).filter(User.email == u["email"]).first()
            if existing:
                print(f"  [skip] {u['email']} already exists")
                continue
            user = User(
                email=u["email"],
                hashed_password=hash_password(u["password"]),
                name=u["name"],
                role=u["role"],
                is_active=True,
            )
            db.add(user)
            print(f"  [create] {u['email']} ({u['role']})")
        db.commit()
        print("Seed completed successfully.")
    except Exception as e:
        db.rollback()
        print(f"Seed failed: {e}")
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    seed()
