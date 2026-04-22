/**
 * E2E-MASTER: Master Data, Departments, Controllers Testing
 */

import { test, expect } from '@playwright/test';
import { ADMIN_USER } from './helpers/auth';
import { mockDataSubjectCategories, mockPersonalDataTypes, mockDepartments, mockControllers } from './fixtures/mock-data';

test.describe('Master Data Management', () => {
  test.beforeEach(async ({ page }) => {
    // Inject auth ก่อน page load
    await page.addInitScript(({ token, user }) => {
      localStorage.setItem('access_token', token);
      localStorage.setItem('user', JSON.stringify(user));
    }, { token: 'mock_admin_token_12345', user: ADMIN_USER });

    await page.route('**/api/master-data/data-subject-categories**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockDataSubjectCategories) });
    });
    await page.route('**/api/master-data/personal-data-types**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockPersonalDataTypes) });
    });
  });

  test('E2E-MASTER-001: แสดงหน้า Master Data และมีข้อมูล', async ({ page }) => {
    await page.goto('/master-data', { waitUntil: 'networkidle' });

    await expect(page.locator('main h1, main h2').filter({ hasText: 'ข้อมูลหลัก' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('ลูกค้า').first()).toBeVisible({ timeout: 10000 });
  });

  test('E2E-MASTER-002: สลับ Tab ได้', async ({ page }) => {
    await page.goto('/master-data', { waitUntil: 'networkidle' });

    await page.locator('button, [role="tab"]').filter({ hasText: 'ประเภทข้อมูลส่วนบุคคล' }).first().click();
    await expect(page.getByText('ชื่อ-นามสกุล')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Departments Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(({ token, user }) => {
      localStorage.setItem('access_token', token);
      localStorage.setItem('user', JSON.stringify(user));
    }, { token: 'mock_admin_token_12345', user: ADMIN_USER });

    await page.route('**/api/departments**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockDepartments) });
    });
  });

  test('E2E-DEPT-001: แสดงหน้า Departments และมีข้อมูล', async ({ page }) => {
    await page.goto('/departments', { waitUntil: 'networkidle' });

    await expect(page.getByText('IT Department')).toBeVisible({ timeout: 15000 });
  });
});

test.describe('Controllers Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(({ token, user }) => {
      localStorage.setItem('access_token', token);
      localStorage.setItem('user', JSON.stringify(user));
    }, { token: 'mock_admin_token_12345', user: ADMIN_USER });

    await page.route('**/api/controllers**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockControllers),
      });
    });
  });

  test('E2E-CTRL-001: แสดงหน้า Controllers และมีข้อมูล', async ({ page }) => {
    await page.goto('/controllers', { waitUntil: 'networkidle' });

    await expect(page.getByText('Triangle Corporation')).toBeVisible({ timeout: 15000 });
  });
});
