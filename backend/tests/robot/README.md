# ROPA Platform — Integration Tests (Robot Framework)

## โครงสร้าง

```
tests/robot/
├── resources/
│   └── keywords.robot          # Shared keywords และ variables
├── 01_auth_tests.robot         # Auth Module (9 test cases)
├── 02_users_tests.robot        # Users CRUD + RBAC (8 test cases)
├── 03_departments_tests.robot  # Departments CRUD (6 test cases)
├── 04_controllers_processors_tests.robot  # Controllers + Processors (7 test cases)
├── 05_master_data_tests.robot  # Master Data CRUD (8 test cases)
├── 06_ropa_records_tests.robot # ROPA Records CRUD + Filters (14 test cases)
├── 07_approval_workflow_tests.robot  # Approval Workflow (5 test cases)
├── 08_dashboard_tests.robot    # Dashboard Analytics (9 test cases)
├── 09_suggestions_tests.robot  # Legal Basis Suggestion (5 test cases)
├── 10_audit_logs_tests.robot   # Audit + Session Logs (7 test cases)
├── run_tests.sh                # Script สำหรับ run ทั้งหมด
└── results/                    # Output จาก robot (สร้างอัตโนมัติ)
```

**รวม: 78 test cases**

## ติดตั้ง Dependencies

```bash
pip install robotframework robotframework-requests
```

## ตั้งค่า

แก้ไข `resources/keywords.robot` ให้ตรงกับ environment:

```robot
${BASE_URL}         http://localhost:8000
${ADMIN_EMAIL}      admin@triangle.com
${ADMIN_PASSWORD}   admin123456
```

> **หมายเหตุ:** ต้องมี Admin user ในระบบก่อน run test

## Run Tests

### Run ทั้งหมด (แนะนำ)
```bash
cd backend/tests/robot
bash run_tests.sh
```

### Run ทั้งหมดด้วย robot โดยตรง
```bash
cd backend/tests/robot
robot --outputdir results .
```

### Run เฉพาะ suite
```bash
robot --outputdir results 01_auth_tests.robot
robot --outputdir results 06_ropa_records_tests.robot
```

### Run เฉพาะ tag
```bash
robot --outputdir results --include positive .
robot --outputdir results --include negative .
robot --outputdir results --include rbac .
robot --outputdir results --include dpo .
```

## ดู Report

หลัง run เสร็จ เปิดไฟล์ใน `results/`:

| ไฟล์ | คำอธิบาย |
|------|----------|
| `report.html` | Summary report — pass/fail overview เปิดใน browser |
| `log.html` | Detailed log — ทุก step พร้อม request/response |
| `output.xml` | Raw XML สำหรับ CI/CD integration |

## Tags ที่ใช้

| Tag | ความหมาย |
|-----|----------|
| `positive` | Test cases ที่คาดว่าสำเร็จ |
| `negative` | Test cases ที่คาดว่า fail/error |
| `rbac` | Test cases ที่เกี่ยวกับ Role-Based Access Control |
| `admin` | Test cases ที่ต้องใช้ Admin role |
| `dpo` | Test cases ที่เกี่ยวกับ DPO workflow |
| `auth` | Auth module |
| `users` | Users module |
| `departments` | Departments module |
| `controllers` | Controllers module |
| `processors` | Processors module |
| `master-data` | Master Data module |
| `ropa` | ROPA Records module |
| `approval` | Approval workflow |
| `dashboard` | Dashboard module |
| `suggestions` | Legal Basis Suggestion |
| `audit` | Audit + Session Logs |
