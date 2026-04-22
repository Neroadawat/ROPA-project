/**
 * E2E-ROPA: ROPA Records Management Testing
 */

import { test, expect } from '@playwright/test';
import { ADMIN_USER } from './helpers/auth';
import { mockRopaRecords, mockDepartments } from './fixtures/mock-data';

test.describe('ROPA Records Management', () => {
  test.beforeEach(async ({ page }) => {
    // Inject auth ก่อน page load ด้วย addInitScript
    const token = 'mock_admin_token_12345';
    const user = ADMIN_USER;
    await page.addInitScript(({ token, user }) => {
      localStorage.setItem('access_token', token);
      localStorage.setItem('user', JSON.stringify(user));
    }, { token, user });

    // Mock ทุก API ที่หน้า ropa-records เรียก
    await page.route('**/api/ropa-records?**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockRopaRecords),
      });
    });

    await page.route('**/api/departments**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockDepartments),
      });
    });

    // Mock retention-alerts (sidebar อาจเรียก)
    await page.route('**/api/ropa-records/retention-alerts**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '{"overdue":[],"within_30":[],"within_60_90":[],"review_overdue":[]}',
      });
    });
  });

  test('E2E-ROPA-001: แสดงหน้า ROPA Records และมีข้อมูลในตาราง', async ({ page }) => {
    await page.goto('/ropa-records', { waitUntil: 'networkidle' });

    // ตรวจสอบว่ามีข้อมูลในตาราง
    await expect(page.getByText('ระบบจัดการข้อมูลลูกค้า')).toBeVisible({ timeout: 15000 });
  });

  test('E2E-ROPA-002: แสดง Status และ Risk Level ภาษาไทย', async ({ page }) => {
    await page.goto('/ropa-records', { waitUntil: 'networkidle' });

    await expect(page.getByText('ระบบจัดการข้อมูลลูกค้า')).toBeVisible({ timeout: 15000 });

    // Status badge ในตาราง (ไม่ใช่ option ใน dropdown filter)
    await expect(page.locator('table >> text=อนุมัติแล้ว').first()).toBeVisible();
    await expect(page.locator('table >> text=กลาง').first()).toBeVisible();
  });

  test('E2E-ROPA-003: มีปุ่ม "สร้าง ROPA"', async ({ page }) => {
    await page.goto('/ropa-records', { waitUntil: 'networkidle' });

    await expect(page.getByRole('button', { name: /สร้าง ROPA/ })).toBeVisible({ timeout: 15000 });
  });
});
