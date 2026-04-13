#!/usr/bin/env python3
"""
Migration script to add rejection tracking fields to ropa_records table.
Adds: rejected_by, rejected_at
Modifies: rejection_reason (from String(500) to Text for longer reasons)
"""

import psycopg2
import sys

def migrate():
    db_url = 'postgresql://postgres.rrsdadnrhetlpbrheiem:Strongpassword-1234@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres'
    
    try:
        conn = psycopg2.connect(db_url)
        cursor = conn.cursor()
        
        print("Starting migration...")
        
        # Check if columns already exist
        cursor.execute("""
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'ropa_records' AND column_name IN ('rejected_by', 'rejected_at')
        """)
        existing = cursor.fetchall()
        
        if len(existing) == 2:
            print("✓ Columns already exist, skipping migration")
            cursor.close()
            conn.close()
            return True
        
        # 1. Modify rejection_reason column if needed
        print("Checking rejection_reason column...")
        cursor.execute("""
        ALTER TABLE ropa_records 
        ALTER COLUMN rejection_reason TYPE text USING rejection_reason::text
        """)
        print("✓ Updated rejection_reason column to text type")
        
        # 2. Add rejected_by column (foreign key to users)
        print("Adding rejected_by column...")
        cursor.execute("""
        ALTER TABLE ropa_records 
        ADD COLUMN IF NOT EXISTS rejected_by INTEGER REFERENCES users(id) ON DELETE SET NULL
        """)
        print("✓ Added rejected_by column")
        
        # 3. Add rejected_at column
        print("Adding rejected_at column...")
        cursor.execute("""
        ALTER TABLE ropa_records 
        ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
        """)
        print("✓ Added rejected_at column")
        
        # 4. Create index on rejected_by for better query performance
        cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_ropa_records_rejected_by ON ropa_records(rejected_by)
        """)
        print("✓ Created index on rejected_by")
        
        # Commit changes
        conn.commit()
        print("\n✅ Migration completed successfully!")
        
        # Verify columns
        cursor.execute("""
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'ropa_records' AND column_name IN ('rejection_reason', 'rejected_by', 'rejected_at')
        ORDER BY column_name
        """)
        print("\nVerification:")
        for col_name, data_type in cursor.fetchall():
            print(f"  • {col_name}: {data_type}")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Error during migration: {e}")
        if conn:
            conn.rollback()
            cursor.close()
            conn.close()
        return False

if __name__ == "__main__":
    success = migrate()
    sys.exit(0 if success else 1)
