# Playwright E2E Tests

## 📋 Overview

ชุดทดสอบ End-to-End (E2E) สำหรับ ROPA Management Platform Frontend โดยใช้ **Playwright** พร้อม **API Mocking** เพื่อให้ test รันได้โดยไม่ต้องพึ่ง backend จริง

## 🎯 Test Coverage

### 1. **Login Flow** (`01-login.spec.ts`)
- ✅ E2E-LOGIN-001: แสดงหน้า login
- ✅ E2E-LOGIN-002: Login สำเร็จ
- ✅ E2E-LOGIN-003: Login ไม่สำเร็จ (credentials ผิด)
- ✅ E2E-LOGIN-004: Validation ข้อมูลไม่ครบ

### 2. **ROPA Records Management** (`02-ropa-records.spec.ts`)
- ✅ E2E-ROPA-001: แสดงรายการในตาราง
- ✅ E2E-ROPA-002: กรองข้อมูลตาม Status
- ✅ E2E-ROPA-003: ค้นหา Records
- ✅ E2E-ROPA-004: ดูรายละเอียด Record
- ✅ E2E-ROPA-005: ปุ่มสร้าง Record ใหม่
- ✅ E2E-ROPA-006: Pagination
- ✅ E2E-ROPA-007: Status Badges

### 3. **Dashboard** (`03-dashboard.spec.ts`)
- ✅ E2E-DASH-001: แสดงหน้า Dashboard
- ✅ E2E-DASH-002: สถิติสรุป (Summary Cards)
- ✅ E2E-DASH-003: กราฟและ Charts
- ✅ E2E-DASH-004: ข้อมูลแยกตาม Department
- ✅ E2E-DASH-005: ข้อมูล Risk Level
- ✅ E2E-DASH-006: Navigation ไปหน้าอื่น

### 4. **Master Data Management** (`04-master-data.spec.ts`)
- ✅ E2E-MASTER-001: แสดงหน้า Master Data
- ✅ E2E-MASTER-002: Data Subject Categories
- ✅ E2E-MASTER-003: Personal Data Types
- ✅ E2E-MASTER-004: Sensitivity Levels
- ✅ E2E-MASTER-005: ปุ่มเพิ่มข้อมูล
- ✅ E2E-DEPT-001: รายการ Departments
- ✅ E2E-DEPT-002: Department Codes
- ✅ E2E-CTRL-001: รายการ Controllers

### 5. **DPO Approval Workflow** (`05-dpo-workflow.spec.ts`)
- ✅ E2E-DPO-001: เข้าหน้า Pending Queue
- ✅ E2E-DPO-002: แสดง Pending Records
- ✅ E2E-DPO-003: ปุ่ม Approve/Reject
- ✅ E2E-DPO-004: Approve Confirmation
- ✅ E2E-DPO-005: Reject ต้องกรอกเหตุผล
- ✅ E2E-DPO-006: ดูรายละเอียดก่อน Approve

**Total: 31 Test Cases**

## 🔧 API Mocking

ทุก test ใช้ **API Mocking** เพื่อ:
- ✅ ไม่ต้องพึ่ง backend จริง
- ✅ Test รันเร็วและเสถียร
- ✅ ควบคุมข้อมูลทดสอบได้ง่าย
- ✅ เหมาะสำหรับ CI/CD

Mock data อยู่ใน `tests/fixtures/mock-data.ts`

## 🚀 การรัน Tests

### รัน Test ทั้งหมด
```bash
npm run test:e2e
```

### รัน Test แบบ Interactive UI Mode
```bash
npm run test:e2e:ui
```

### รัน Test เฉพาะไฟล์
```bash
npx playwright test 01-login.spec.ts
```

### รัน Test แบบ Debug Mode
```bash
npx playwright test --debug
```

### รัน Test บน Browser เฉพาะ
```bash
npx playwright test --project=chromium
```

## 📊 Test Reports

หลังรัน test เสร็จ จะได้ report 3 รูปแบบ:

### 1. **HTML Report** (แนะนำ)
```bash
npx playwright show-report
```
- Interactive report พร้อม screenshots
- ดูรายละเอียดแต่ละ test ได้
- **ใช้แนบในเอกสาร project**

### 2. **Trace Viewer** (สำหรับ Debug)
```bash
npx playwright show-trace playwright-report/trace.zip
```
- Time-travel debugging
- ดู DOM snapshot และ network requests
- **ใช้เมื่อ test fail**

### 3. **JSON Report** (สำหรับ CI)
- อยู่ใน `playwright-report/results.json`
- ใช้ integrate กับ GitHub Actions

## 📁 โครงสร้างไฟล์

```
frontend/tests/
├── fixtures/
│   └── mock-data.ts          # Mock data สำหรับ API
├── helpers/
│   └── auth.ts               # Authentication helpers
├── 01-login.spec.ts          # Login flow tests
├── 02-ropa-records.spec.ts   # ROPA records tests
├── 03-dashboard.spec.ts      # Dashboard tests
├── 04-master-data.spec.ts    # Master data tests
├── 05-dpo-workflow.spec.ts   # DPO workflow tests
└── README.md                 # เอกสารนี้
```

## ⚙️ Configuration

การตั้งค่าอยู่ใน `playwright.config.ts`:
- Base URL: `http://localhost:3000`
- Browser: Chromium (Chrome)
- Auto-start dev server: `npm run dev`
- Screenshots: เก็บเฉพาะเมื่อ test fail
- Videos: เก็บเฉพาะเมื่อ test fail
- Traces: เก็บเฉพาะเมื่อ test fail

## 🎭 Playwright Features

### 1. **Auto-wait**
Playwright รอ element พร้อมอัตโนมัติ ไม่ต้อง `sleep()` หรือ `waitFor()` เอง

### 2. **Auto-retry**
Retry assertions อัตโนมัติจนกว่าจะ pass หรือ timeout

### 3. **Trace Viewer**
Debug test ด้วย time-travel - ย้อนดูทุก step ของ test

### 4. **Parallel Execution**
รัน test หลายไฟล์พร้อมกันเพื่อความเร็ว

### 5. **Cross-browser Testing**
รัน test บน Chrome, Firefox, Safari พร้อมกัน

## 📝 หมายเหตุ

### ข้อดีของ API Mocking:
- ✅ Test รันเร็ว (ไม่ต้องรอ API จริง)
- ✅ ไม่ต้อง setup backend
- ✅ ควบคุมข้อมูลทดสอบได้ง่าย
- ✅ Test เสถียร (ไม่พึ่งข้อมูลจริง)

### ข้อควรระวัง:
- ⚠️ Mock data ต้องตรงกับ API จริง
- ⚠️ ต้องอัปเดต mock เมื่อ API เปลี่ยน
- ⚠️ ควรมี Integration Test กับ backend จริงด้วย (Robot Framework)

## 🔗 Resources

- [Playwright Documentation](https://playwright.dev)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [API Mocking Guide](https://playwright.dev/docs/mock)
- [Trace Viewer](https://playwright.dev/docs/trace-viewer)

## 🎯 Next Steps

1. ✅ รัน test ครั้งแรก: `npm run test:e2e`
2. ✅ ดู HTML report: `npx playwright show-report`
3. ✅ Setup GitHub Actions (ดูใน `.github/workflows/playwright.yml`)
4. ✅ เพิ่ม test cases ตามความต้องการ
