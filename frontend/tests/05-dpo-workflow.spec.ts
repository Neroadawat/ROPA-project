/**
 * E2E-DPO: DPO Approval Workflow Testing
 */

import { test, expect } from '@playwright/test';
import { DPO_USER } from './helpers/auth';
import { mockPendingRecords } from './fixtures/mock-data';

test.describe('DPO Approval Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Inject DPO auth ก่อน page load
    await page.addInitScript(({ token, user }) => {
      localStorage.setItem('access_token', token);
      localStorage.setItem('user', JSON.stringify(user));
    }, { token: 'mock_dpo_token_67890', user: DPO_USER });

    await page.route('**/api/ropa-records/pending**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockPendingRecords) });
    });
  });

  test('E2E-DPO-001: แสดงหน้า Pending Queue และมีข้อมูล', async ({ page }) => {
    await page.goto('/dpo/pending', { waitUntil: 'networkidle' });

    await expect(page.locator('main h1, main h2').filter({ hasText: 'อนุมัติ ROPA' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('ระบบบริหารทรัพยากรบุคคล')).toBeVisible({ timeout: 10000 });
  });

  test('E2E-DPO-002: แสดง Status "รออนุมัติสร้าง"', async ({ page }) => {
    await page.goto('/dpo/pending', { waitUntil: 'networkidle' });

    await expect(page.getByText('รออนุมัติสร้าง')).toBeVisible({ timeout: 10000 });
  });

  test('E2E-DPO-003: มีปุ่ม Action ในแต่ละแถว', async ({ page }) => {
    await page.goto('/dpo/pending', { waitUntil: 'networkidle' });

    await expect(page.getByText('ระบบบริหารทรัพยากรบุคคล')).toBeVisible({ timeout: 10000 });

    const firstRowButtons = page.locator('tbody tr').first().locator('button');
    await expect(firstRowButtons.first()).toBeVisible({ timeout: 5000 });
  });
});
