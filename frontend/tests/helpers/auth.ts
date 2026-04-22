/**
 * Authentication helpers สำหรับ Playwright tests
 * localStorage keys: "access_token" และ "user"
 * 
 * Auth context อ่าน localStorage โดยตรง ไม่ได้เรียก /api/auth/me
 * ดังนั้น inject localStorage แล้ว goto page ได้เลย
 */

import { Page } from '@playwright/test';

export const ADMIN_USER = {
  id: 1,
  email: 'admin@triangle.com',
  name: 'Admin User',
  role: 'Admin',
  department_id: null,
  is_active: true,
};

export const DPO_USER = {
  id: 2,
  email: 'DPO@triangle.com',
  name: 'DPO User',
  role: 'DPO',
  department_id: null,
  is_active: true,
};

/**
 * Inject auth token โดยตรงใน localStorage
 * Auth context จะอ่าน localStorage และ set user state โดยไม่ต้องเรียก API
 */
export async function injectAuth(page: Page, role: 'Admin' | 'DPO' = 'Admin', skipRedirect = false) {
  const user = role === 'DPO' ? DPO_USER : ADMIN_USER;
  const token = role === 'DPO' ? 'mock_dpo_token_67890' : 'mock_admin_token_12345';

  // ต้องไปหน้าใดก่อนเพื่อ set localStorage ได้
  await page.goto('/');

  // Set localStorage — auth context จะอ่านค่านี้เมื่อ mount
  await page.evaluate(({ token, user }) => {
    localStorage.setItem('access_token', token);
    localStorage.setItem('user', JSON.stringify(user));
  }, { token, user });

  // รอให้ auth context อ่าน localStorage และ redirect ออกจาก /login (ถ้าไม่ skip)
  if (!skipRedirect) {
    try {
      await page.waitForURL('**/dashboard', { timeout: 5000 });
      await page.waitForLoadState('networkidle', { timeout: 5000 });
    } catch {
      // ถ้าไม่ redirect ก็ reload page เพื่อให้ auth context อ่าน localStorage ใหม่
      await page.reload();
    }
  }
}
