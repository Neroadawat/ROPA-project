#!/usr/bin/env python3
"""
Inspect Supabase PostgreSQL schema and compare with design ER diagram.
"""

import psycopg2
import json
from collections import defaultdict

def get_database_schema():
    db_url = 'postgresql://postgres.rrsdadnrhetlpbrheiem:Strongpassword-1234@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres'
    
    try:
        conn = psycopg2.connect(db_url)
        cursor = conn.cursor()
        
        # Get all tables in the public schema
        cursor.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name
        """)
        
        tables = [row[0] for row in cursor.fetchall()]
        print("=" * 80)
        print("CURRENT SUPABASE TABLES")
        print("=" * 80)
        print(f"Total tables: {len(tables)}\n")
        
        schema_info = {}
        
        for table in tables:
            # Get columns
            cursor.execute(f"""
            SELECT 
                column_name, 
                data_type, 
                is_nullable,
                column_default
            FROM information_schema.columns 
            WHERE table_name = '{table}'
            ORDER BY ordinal_position
            """)
            
            columns = cursor.fetchall()
            schema_info[table] = {
                'columns': [],
                'primary_keys': [],
                'foreign_keys': [],
                'unique_constraints': []
            }
            
            for col_name, data_type, is_nullable, col_default in columns:
                nullable = 'NULL' if is_nullable == 'YES' else 'NOT NULL'
                schema_info[table]['columns'].append({
                    'name': col_name,
                    'type': data_type,
                    'nullable': is_nullable == 'YES',
                    'default': col_default
                })
            
            # Get primary keys
            cursor.execute(f"""
            SELECT a.attname
            FROM pg_constraint c
            JOIN pg_class t ON c.conrelid = t.oid
            JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
            WHERE t.relname = '{table}' AND c.contype = 'p'
            """)
            pks = cursor.fetchall()
            schema_info[table]['primary_keys'] = [pk[0] for pk in pks] if pks else []
            
            # Get foreign keys
            cursor.execute(f"""
            SELECT 
                kcu.column_name, 
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name
            FROM information_schema.key_column_usage AS kcu
            JOIN information_schema.constraint_column_usage AS ccu
                ON ccu.constraint_name = kcu.constraint_name
            WHERE kcu.table_name = '{table}' 
                AND kcu.constraint_name LIKE '%_fkey'
            """)
            
            fks = cursor.fetchall()
            for fk in fks:
                schema_info[table]['foreign_keys'].append({
                    'column': fk[0],
                    'references_table': fk[1],
                    'references_column': fk[2]
                })
            
            # Get unique constraints
            cursor.execute(f"""
            SELECT a.attname
            FROM pg_constraint c
            JOIN pg_class t ON c.conrelid = t.oid
            JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
            WHERE t.relname = '{table}' AND c.contype = 'u'
            """)
            
            uks = cursor.fetchall()
            schema_info[table]['unique_constraints'] = [uk[0] for uk in uks]
        
        # Print detailed schema
        for table in sorted(tables):
            info = schema_info[table]
            print(f"\n📋 TABLE: {table}")
            print("-" * 80)
            
            # Columns
            print("  Columns:")
            for col in info['columns']:
                nullable_marker = "✓ NULL" if col['nullable'] else "✗ NOT NULL"
                print(f"    • {col['name']}: {col['type']:20} [{nullable_marker}]")
            
            # Primary Keys
            if info['primary_keys']:
                print(f"  Primary Keys: {', '.join(info['primary_keys'])}")
            
            # Foreign Keys
            if info['foreign_keys']:
                print("  Foreign Keys:")
                for fk in info['foreign_keys']:
                    print(f"    • {fk['column']} → {fk['references_table']}.{fk['references_column']}")
            
            # Unique Constraints
            if info['unique_constraints']:
                print(f"  Unique Constraints: {', '.join(info['unique_constraints'])}")
        
        cursor.close()
        conn.close()
        
        return tables, schema_info
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return None, None

def compare_with_er():
    """Compare current schema with designed ER diagram"""
    
    expected_tables = {
        'departments': {
            'required_columns': ['id', 'name', 'code', 'is_active', 'created_at', 'updated_at'],
            'unique': ['code'],
            'description': 'แผนก'
        },
        'users': {
            'required_columns': ['id', 'email', 'hashed_password', 'name', 'role', 'department_id', 'is_active', 'created_at', 'updated_at'],
            'unique': ['email'],
            'description': 'ผู้ใช้ระบบ'
        },
        'controllers': {
            'required_columns': ['id', 'name', 'address', 'email', 'phone', 'is_active', 'created_at', 'updated_at'],
            'unique': [],
            'description': 'Data Controller'
        },
        'processors': {
            'required_columns': ['id', 'name', 'address', 'email', 'phone', 'source_controller_id', 'data_category', 'is_active', 'created_at', 'updated_at'],
            'unique': [],
            'description': 'Data Processor'
        },
        'ropa_records': {
            'required_columns': ['id', 'department_id', 'created_by', 'controller_id', 'processor_id', 'role_type', 'status', 'rejection_reason', 'rejected_by', 'rejected_at', 'approved_by', 'approved_at', 'is_deleted', 'activity_name', 'purpose', 'risk_level', 'data_acquisition_method', 'data_source_direct', 'data_source_other', 'legal_basis_thai', 'minor_consent_under_10', 'minor_consent_10_20', 'cross_border_transfer', 'cross_border_affiliate', 'cross_border_method', 'cross_border_standard', 'cross_border_exception', 'retention_period', 'retention_expiry_date', 'next_review_date', 'storage_type', 'storage_method', 'access_rights', 'deletion_method', 'data_owner', 'third_party_recipients', 'disclosure_exemption', 'rights_refusal', 'security_organizational', 'security_technical', 'security_physical', 'security_access_control', 'security_responsibility', 'security_audit', 'created_at', 'updated_at'],
            'unique': [],
            'description': 'ROPA Records (ทั้ง 8 ส่วน)'
        },
        'record_versions': {
            'required_columns': ['id', 'ropa_record_id', 'version_number', 'snapshot', 'changed_by', 'change_reason', 'created_at'],
            'unique': [],
            'description': 'Version History'
        },
        'data_subject_categories': {
            'required_columns': ['id', 'name', 'description', 'created_at'],
            'unique': ['name'],
            'description': 'หมวดหมู่เจ้าของข้อมูล'
        },
        'personal_data_types': {
            'required_columns': ['id', 'name', 'category', 'sensitivity_level', 'created_at'],
            'unique': ['name'],
            'description': 'ประเภทข้อมูลส่วนบุคคล'
        },
        'audit_logs': {
            'required_columns': ['id', 'user_id', 'action', 'table_name', 'record_id', 'old_value', 'new_value', 'reason', 'created_at'],
            'unique': [],
            'description': 'บันทึกการตรวจสอบ'
        },
        'import_batches': {
            'required_columns': ['id', 'imported_by', 'filename', 'rows_success', 'rows_failed', 'status', 'error_details', 'created_at'],
            'unique': [],
            'description': 'การนำเข้า Excel'
        },
        'ropa_data_subjects': {
            'required_columns': ['ropa_record_id', 'data_subject_category_id'],
            'unique': [],
            'description': 'Junction table'
        },
        'ropa_personal_data_types': {
            'required_columns': ['ropa_record_id', 'personal_data_type_id'],
            'unique': [],
            'description': 'Junction table'
        },
        'suggestion_logs': {
            'required_columns': ['id', 'user_id', 'ropa_record_id', 'input_activity_name', 'input_purpose', 'suggestions', 'selected_legal_basis', 'accepted', 'engine_version', 'created_at'],
            'unique': [],
            'description': 'บันทึกคำแนะนำ Legal Basis'
        },
        'user_session_logs': {
            'required_columns': ['id', 'user_id', 'action', 'ip_address', 'created_at'],
            'unique': [],
            'description': 'บันทึก Login/Logout'
        }
    }
    
    tables, schema_info = get_database_schema()
    
    if not tables or not schema_info:
        print("❌ ไม่สามารถเชื่อมต่อฐานข้อมูล")
        return
    
    print("\n" + "=" * 80)
    print("COMPARISON WITH ER DIAGRAM")
    print("=" * 80)
    
    actual_table_names = set(tables)
    expected_table_names = set(expected_tables.keys())
    
    # Check for missing tables
    missing_tables = expected_table_names - actual_table_names
    extra_tables = actual_table_names - expected_table_names
    
    if missing_tables:
        print(f"\n❌ MISSING TABLES ({len(missing_tables)}):")
        for table in sorted(missing_tables):
            print(f"   • {table} - {expected_tables[table]['description']}")
    
    if extra_tables:
        print(f"\n⚠️  EXTRA TABLES ({len(extra_tables)}):")
        for table in sorted(extra_tables):
            print(f"   • {table}")
    
    # Check existing tables
    print(f"\n✅ MATCHING TABLES ({len(actual_table_names & expected_table_names)}):")
    
    issues = []
    for table in sorted(actual_table_names & expected_table_names):
        expected = expected_tables[table]
        actual_cols = {col['name'] for col in schema_info[table]['columns']}
        expected_cols = set(expected['required_columns'])
        
        missing_cols = expected_cols - actual_cols
        extra_cols = actual_cols - expected_cols
        
        if missing_cols or extra_cols:
            issues.append((table, missing_cols, extra_cols))
            print(f"   ⚠️  {table} - {expected['description']}")
        else:
            print(f"   ✓ {table} - {expected['description']}")
    
    # Detail issues
    if issues:
        print(f"\n⚠️  COLUMN MISMATCHES ({len(issues)}):")
        for table, missing, extra in issues:
            if missing:
                print(f"\n   Table: {table}")
                print(f"   Missing columns: {', '.join(sorted(missing))}")
            if extra:
                print(f"   Extra columns: {', '.join(sorted(extra))}")
    
    # Summary
    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)
    total_expected = len(expected_table_names)
    total_actual = len(actual_table_names)
    matching = len(actual_table_names & expected_table_names)
    
    print(f"Expected tables: {total_expected}")
    print(f"Actual tables:   {total_actual}")
    print(f"Matching:        {matching}")
    print(f"Missing:         {len(missing_tables)}")
    print(f"Extra:           {len(extra_tables)}")
    print(f"Schema issues:   {len(issues)}")
    
    if len(missing_tables) == 0 and len(extra_tables) == 0 and len(issues) == 0:
        print("\n✅ DATABASE SCHEMA MATCHES ER DIAGRAM PERFECTLY!")
    else:
        print("\n❌ DATABASE SCHEMA DOES NOT MATCH ER DIAGRAM")
    
    print("=" * 80)

if __name__ == "__main__":
    compare_with_er()
