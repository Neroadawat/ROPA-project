/**
 * E2E-DASH: Dashboard Testing
 */

import { test, expect } from '@playwright/test';
import { ADMIN_USER } from './helpers/auth';
import { mockDashboardSummary } from './fixtures/mock-data';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Inject auth ก่อน page load
    await page.addInitScript(({ token, user }) => {
      localStorage.setItem('access_token', token);
      localStorage.setItem('user', JSON.stringify(user));
    }, { token: 'mock_admin_token_12345', user: ADMIN_USER });

    // Mock ทุก dashboard API
    await page.route('**/api/dashboard/summary', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockDashboardSummary) });
    });
    await page.route('**/api/dashboard/trends', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"monthly_trends":[]}' });
    });
    await page.route('**/api/dashboard/status-overview', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"statuses":{"approved":10,"pending_approval":3,"rejected":2}}' });
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
  });

  test('E2E-DASH-001: แสดงหน้า Dashboard', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'networkidle' });

    await expect(page.locator('main h1, main h2').filter({ hasText: 'แดชบอร์ด' })).toBeVisible({ timeout: 15000 });
  });

  test('E2E-DASH-002: แสดง Summary Cards', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'networkidle' });

    await expect(page.getByText('ROPA ทั้งหมด')).toBeVisible({ timeout: 15000 });
    // "อนุมัติแล้ว" อาจอยู่ใน summary card label
    await expect(page.locator('main').getByText('อนุมัติแล้ว').first()).toBeVisible();
  });

  test('E2E-DASH-003: แสดงตัวเลขสถิติ', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'networkidle' });

    // total = 15 จาก mock summary
    await expect(page.getByText('15').first()).toBeVisible({ timeout: 15000 });
  });
});
