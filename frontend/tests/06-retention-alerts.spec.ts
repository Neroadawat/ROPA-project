/**
 * E2E-RET: Retention Alerts Page Testing
 * ทดสอบหน้าแจ้งเตือนการเก็บรักษาข้อมูล (/ropa-records/retention-alerts)
 */

import { test, expect } from '@playwright/test';
import { ADMIN_USER } from './helpers/auth';

// ─── Mock Data ───

const mockRetentionAlertsWithData = {
  overdue: [
    {
      id: 10,
      process_name: 'ระบบจัดการข้อมูลลูกค้า',
      activity_name: 'ระบบจัดการข้อมูลลูกค้า',
      department_name: 'IT Department',
      retention_expiry_date: '2025-01-15',
      next_review_date: '2025-06-01',
      urgency: 'overdue',
    },
    {
      id: 11,
      process_name: 'ระบบ HR',
      activity_name: 'ระบบ HR',
      department_name: 'HR Department',
      retention_expiry_date: '2025-03-01',
      next_review_date: null,
      urgency: 'overdue',
    },
  ],
  within_30: [
    {
      id: 20,
      process_name: 'ระบบบัญชี',
      activity_name: 'ระบบบัญชี',
      department_name: 'Finance Department',
      retention_expiry_date: '2026-05-10',
      next_review_date: null,
      urgency: 'within_30',
    },
  ],
  within_60_90: [
    {
      id: 30,
      process_name: 'ระบบจัดซื้อ',
      activity_name: 'ระบบจัดซื้อ',
      department_name: 'IT Department',
      retention_expiry_date: '2026-07-01',
      next_review_date: null,
      urgency: 'within_60_90',
    },
  ],
  review_overdue: [
    {
      id: 40,
      process_name: 'ระบบ CRM',
      activity_name: 'ระบบ CRM',
      department_name: 'IT Department',
      retention_expiry_date: null,
      next_review_date: '2025-12-01',
      urgency: 'review_overdue',
    },
  ],
};

const mockRetentionAlertsEmpty = {
  overdue: [],
  within_30: [],
  within_60_90: [],
  review_overdue: [],
};

// ─── Tests ───

test.describe('Retention Alerts Page', () => {
  test.beforeEach(async ({ page }) => {
    // Inject auth
    await page.addInitScript(({ token, user }) => {
      localStorage.setItem('access_token', token);
      localStorage.setItem('user', JSON.stringify(user));
    }, { token: 'mock_admin_token_12345', user: ADMIN_USER });
  });

  test('E2E-RET-001: แสดงหน้า Retention Alerts พร้อมข้อมูล', async ({ page }) => {
    await page.route('**/api/ropa-records/retention-alerts**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockRetentionAlertsWithData),
      });
    });

    await page.goto('/ropa-records/retention-alerts', { waitUntil: 'networkidle' });

    // ตรวจสอบ title
    await expect(page.getByText('การแจ้งเตือนการเก็บรักษาข้อมูล')).toBeVisible({ timeout: 15000 });

    // ตรวจสอบ total count (2 + 1 + 1 + 1 = 5)
    await expect(page.getByText('5 รายการที่ต้องดำเนินการ')).toBeVisible();
  });

  test('E2E-RET-002: แสดง Summary Cards ตัวเลขถูกต้อง', async ({ page }) => {
    await page.route('**/api/ropa-records/retention-alerts**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockRetentionAlertsWithData),
      });
    });

    await page.goto('/ropa-records/retention-alerts', { waitUntil: 'networkidle' });

    // Summary cards: overdue=2, within_30=1, within_60_90=1, review_overdue=1
    const cards = page.locator('.grid.grid-cols-4 > div');
    await expect(cards).toHaveCount(4, { timeout: 15000 });

    // เช็คว่ามีตัวเลข 2 (overdue count)
    await expect(cards.nth(0).getByText('2')).toBeVisible();
    // เช็คว่ามีตัวเลข 1 (within_30 count)
    await expect(cards.nth(1).getByText('1')).toBeVisible();
  });

  test('E2E-RET-003: แสดงรายการ overdue alerts', async ({ page }) => {
    await page.route('**/api/ropa-records/retention-alerts**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockRetentionAlertsWithData),
      });
    });

    await page.goto('/ropa-records/retention-alerts', { waitUntil: 'networkidle' });

    // ตรวจสอบว่ามี activity names แสดง
    await expect(page.getByText('ระบบจัดการข้อมูลลูกค้า')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('ระบบ HR')).toBeVisible();
    // ตรวจสอบ department name
    await expect(page.getByText('IT Department').first()).toBeVisible();
    await expect(page.getByText('HR Department')).toBeVisible();
  });

  test('E2E-RET-004: แสดง section headers ตาม urgency', async ({ page }) => {
    await page.route('**/api/ropa-records/retention-alerts**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockRetentionAlertsWithData),
      });
    });

    await page.goto('/ropa-records/retention-alerts', { waitUntil: 'networkidle' });

    // ตรวจสอบ section headers
    await expect(page.getByRole('heading', { name: 'เกินกำหนดการเก็บรักษา' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('heading', { name: 'เกินกำหนดทบทวน' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'หมดอายุภายใน 30 วัน' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'หมดอายุภายใน 31-90 วัน' })).toBeVisible();
  });

  test('E2E-RET-005: แสดง empty state เมื่อไม่มี alerts', async ({ page }) => {
    await page.route('**/api/ropa-records/retention-alerts**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockRetentionAlertsEmpty),
      });
    });

    await page.goto('/ropa-records/retention-alerts', { waitUntil: 'networkidle' });

    // ตรวจสอบ empty state message
    await expect(page.getByText('ไม่มีการแจ้งเตือนในขณะนี้')).toBeVisible({ timeout: 15000 });
    // total ต้องเป็น 0
    await expect(page.getByText('0 รายการที่ต้องดำเนินการ')).toBeVisible();
  });

  test('E2E-RET-006: ปุ่มกลับ navigate ไปหน้า ROPA Records', async ({ page }) => {
    await page.route('**/api/ropa-records/retention-alerts**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockRetentionAlertsEmpty),
      });
    });
    // Mock ROPA records list page
    await page.route('**/api/ropa-records?**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [], total: 0, page: 1, per_page: 20, pages: 0 }),
      });
    });
    await page.route('**/api/departments**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [], total: 0, page: 1, per_page: 100, pages: 0 }),
      });
    });

    await page.goto('/ropa-records/retention-alerts', { waitUntil: 'networkidle' });

    // คลิกปุ่มกลับ
    const backButton = page.getByRole('button', { name: /กลับ/ });
    await expect(backButton).toBeVisible({ timeout: 15000 });
    await backButton.click();

    // ต้อง navigate ไปหน้า /ropa-records
    await page.waitForURL('**/ropa-records', { timeout: 10000 });
  });

  test('E2E-RET-007: แสดง error toast เมื่อ API fail', async ({ page }) => {
    await page.route('**/api/ropa-records/retention-alerts**', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Internal Server Error' }),
      });
    });

    await page.goto('/ropa-records/retention-alerts', { waitUntil: 'networkidle' });

    // ตรวจสอบว่ามี error toast แสดง
    await expect(page.getByText(/ไม่สามารถโหลดการแจ้งเตือนได้|Internal Server Error/)).toBeVisible({ timeout: 15000 });
  });
});

test.describe('Dashboard Retention Alerts Summary', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(({ token, user }) => {
      localStorage.setItem('access_token', token);
      localStorage.setItem('user', JSON.stringify(user));
    }, { token: 'mock_admin_token_12345', user: ADMIN_USER });
  });

  test('E2E-RET-008: Dashboard แสดง retention alerts summary เมื่อมี alerts', async ({ page }) => {
    // Mock all dashboard APIs
    await page.route('**/api/dashboard/summary', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"total":10,"by_department":[],"by_risk_level":[],"by_legal_basis":[]}' });
    });
    await page.route('**/api/dashboard/trends', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"monthly_trends":[]}' });
    });
    await page.route('**/api/dashboard/status-overview', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"statuses":{}}' });
    });
    await page.route('**/api/dashboard/compliance-scores', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"scores":[]}' });
    });
    await page.route('**/api/dashboard/sensitive-data-mapping', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"mapping":[]}' });
    });
    await page.route('**/api/dashboard/completeness', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"average_completeness_pct":0,"records":[]}' });
    });
    await page.route('**/api/dashboard/risk-heatmap', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"heatmap":[]}' });
    });
    // Retention alerts with counts > 0
    await page.route('**/api/dashboard/retention-alerts', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ overdue: 3, within_30: 1, within_60_90: 2, review_overdue: 1 }),
      });
    });

    await page.goto('/dashboard', { waitUntil: 'networkidle' });

    // ตรวจสอบว่ามี retention alerts section แสดง
    await expect(page.getByText('สรุปการแจ้งเตือนการเก็บรักษาข้อมูล')).toBeVisible({ timeout: 15000 });
    // ตรวจสอบ labels
    await expect(page.getByText('เกินกำหนด', { exact: true })).toBeVisible();
    await expect(page.getByText('ภายใน 30 วัน')).toBeVisible();
    await expect(page.getByText('ภายใน 31-90 วัน')).toBeVisible();
    await expect(page.getByText('เกินกำหนดทบทวน')).toBeVisible();
  });

  test('E2E-RET-009: Dashboard ซ่อน retention alerts เมื่อไม่มี alerts', async ({ page }) => {
    await page.route('**/api/dashboard/summary', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"total":10,"by_department":[],"by_risk_level":[],"by_legal_basis":[]}' });
    });
    await page.route('**/api/dashboard/trends', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"monthly_trends":[]}' });
    });
    await page.route('**/api/dashboard/status-overview', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"statuses":{}}' });
    });
    await page.route('**/api/dashboard/compliance-scores', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"scores":[]}' });
    });
    await page.route('**/api/dashboard/sensitive-data-mapping', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"mapping":[]}' });
    });
    await page.route('**/api/dashboard/completeness', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"average_completeness_pct":0,"records":[]}' });
    });
    await page.route('**/api/dashboard/risk-heatmap', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"heatmap":[]}' });
    });
    // All zeros
    await page.route('**/api/dashboard/retention-alerts', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ overdue: 0, within_30: 0, within_60_90: 0, review_overdue: 0 }),
      });
    });

    await page.goto('/dashboard', { waitUntil: 'networkidle' });

    // Retention alerts section ต้องไม่แสดง (totalAlerts === 0)
    await expect(page.getByText('สรุปการแจ้งเตือนการเก็บรักษาข้อมูล')).not.toBeVisible({ timeout: 10000 });
  });
});
