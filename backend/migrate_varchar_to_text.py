#!/usr/bin/env python3
"""
Migrate VARCHAR(255) columns to TEXT in ropa_records table
to support longer content
"""

from sqlalchemy import text
from app.database import engine

def migrate():
    """Alter columns from VARCHAR(255) to TEXT"""
    
    columns_to_migrate = [
        'activity_name',
        'data_acquisition_method',
        'data_source_direct',
        'data_source_other',
        'legal_basis_thai',
        'minor_consent_under_10',
        'minor_consent_10_20',
        'cross_border_affiliate',
        'cross_border_method',
        'cross_border_standard',
        'cross_border_exception',
        'retention_period',
        'storage_type',
        'storage_method',
        'access_rights',
        'deletion_method',
        'data_owner',
    ]
    
    with engine.connect() as conn:
        for column in columns_to_migrate:
            try:
                # PostgreSQL: ALTER COLUMN TYPE
                sql = f"""
                    ALTER TABLE ropa_records 
                    ALTER COLUMN {column} TYPE TEXT
                """
                conn.execute(text(sql))
                conn.commit()
                print(f"✓ Migrated column: {column}")
            except Exception as e:
                print(f"✗ Error migrating {column}: {e}")
                conn.rollback()

if __name__ == "__main__":
    print("Starting migration: VARCHAR(255) -> TEXT")
    print("=" * 50)
    migrate()
    print("=" * 50)
    print("Migration complete!")
