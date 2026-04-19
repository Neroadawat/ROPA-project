from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from sqlalchemy.pool import NullPool

from app.config import settings

# Configure connection pool for Supabase Session mode
# Session mode has strict limits on concurrent connections
engine = create_engine(
    settings.DATABASE_URL,
    poolclass=NullPool,  # Use NullPool to avoid connection pooling issues with Session mode
    # Alternative: if you need pooling, use small values:
    # pool_size=5,
    # max_overflow=10,
    # pool_recycle=3600,
    # pool_pre_ping=True,
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    """สร้างตารางทั้งหมดใน database (ใช้แทน Alembic)"""
    import app.models  # noqa: F401
    Base.metadata.create_all(bind=engine)
