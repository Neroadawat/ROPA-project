/**
 * E2E-LOGIN: Login Flow Testing
 */

import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test('E2E-LOGIN-001: แสดงหน้า login ได้', async ({ page }) => {
    await page.goto('/login');

    // ตรวจสอบ title ภาษาไทย (ใช้ h1/h2 เพื่อหลีกเลี่ยง strict mode)
    await expect(page.locator('h1, h2').filter({ hasText: 'ยินดีต้อนรับ' })).toBeVisible({ timeout: 8000 });
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toContainText('เข้าสู่ระบบ');
  });

  test('E2E-LOGIN-002: Login สำเร็จด้วย credentials ที่ถูกต้อง', async ({ page }) => {
    await page.route('**/api/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'mock_token_12345',
          token_type: 'bearer',
          user: {
            id: 1, email: 'admin@triangle.com', name: 'Admin User',
            role: 'Admin', department_id: null, is_active: true,
            created_at: '2026-01-01T00:00:00', updated_at: null,
          },
        }),
      });
    });

    // Mock ทุก dashboard APIs ที่จะถูกเรียกหลัง redirect
    await page.route('**/api/dashboard/summary', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"total":0,"by_department":[],"by_risk_level":[]}' });
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
    await page.route('**/api/dashboard/retention-alerts', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"overdue":0,"within_30":0,"within_60_90":0,"review_overdue":0}' });
    });
    await page.route('**/api/dashboard/completeness', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"average_completeness_pct":0,"records":[]}' });
    });
    await page.route('**/api/dashboard/risk-heatmap', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"heatmap":[]}' });
    });

    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@triangle.com');
    await page.fill('input[type="password"]', 'admin123456');
    await page.click('button[type="submit"]');

    await page.waitForURL('**/dashboard', { timeout: 8000 });

    const token = await page.evaluate(() => localStorage.getItem('access_token'));
    expect(token).toBe('mock_token_12345');
  });

  test('E2E-LOGIN-003: Login ไม่สำเร็จด้วย credentials ผิด', async ({ page }) => {
    await page.route('**/api/auth/login', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' }),
      });
    });

    await page.goto('/login');
    await page.fill('input[type="email"]', 'wrong@email.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // ยังอยู่หน้า login
    await expect(page).toHaveURL(/\/login/, { timeout: 3000 });

    // แสดง error message (อาจเป็น toast หรือ inline error)
    await expect(
      page.locator('text=อีเมลหรือรหัสผ่านไม่ถูกต้อง')
        .or(page.locator('[role="alert"]'))
        .or(page.locator('.text-red-500, .text-destructive'))
    ).toBeVisible({ timeout: 5000 });
  });

  test('E2E-LOGIN-004: แสดง Dev Accounts สำหรับทดสอบ', async ({ page }) => {
    await page.goto('/login');

    // Dev accounts section แสดง role badges
    await expect(page.locator('text=Viewer_Auditor').or(page.locator('text=Viewer Auditor'))).toBeVisible({ timeout: 5000 });
  });

  test('E2E-LOGIN-005: คลิก Dev Account แล้ว autofill email/password', async ({ page }) => {
    await page.goto('/login');

    // คลิก dev account ตัวแรก
    const devAccountBtn = page.locator('button').filter({ hasText: /admin@triangle\.com/i }).first();
    await devAccountBtn.click();

    const emailValue = await page.locator('input[type="email"]').inputValue();
    expect(emailValue).toContain('@triangle.com');
  });
});
