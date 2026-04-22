/**
 * Mock data สำหรับ Playwright E2E Testing
 * ใช้จำลองข้อมูลจาก API เพื่อให้ test ไม่ต้องพึ่ง backend จริง
 */

export const mockAuthResponse = {
  access_token: 'mock_token_12345',
  token_type: 'bearer',
  user: {
    id: 1,
    email: 'admin@triangle.com',
    name: 'Admin User',
    role: 'Admin',
    is_active: true,
  },
};

export const mockDPOAuthResponse = {
  access_token: 'mock_dpo_token_67890',
  token_type: 'bearer',
  user: {
    id: 2,
    email: 'dpo@triangle.com',
    name: 'DPO User',
    role: 'DPO',
    is_active: true,
  },
};

export const mockDepartments = {
  items: [
    { id: 1, name: 'IT Department', code: 'IT', is_active: true, created_at: '2026-01-01T00:00:00', updated_at: null },
    { id: 2, name: 'HR Department', code: 'HR', is_active: true, created_at: '2026-01-01T00:00:00', updated_at: null },
    { id: 3, name: 'Finance Department', code: 'FIN', is_active: true, created_at: '2026-01-01T00:00:00', updated_at: null },
  ],
  total: 3,
  page: 1,
  per_page: 100,
  pages: 1,
};

export const mockControllers = {
  items: [
    { id: 1, name: 'Triangle Corporation', is_active: true },
    { id: 2, name: 'External Partner Ltd.', is_active: true },
  ],
  total: 2,
  page: 1,
  pages: 1,
};

export const mockProcessors = {
  items: [
    { id: 1, name: 'Cloud Storage Provider', is_active: true },
    { id: 2, name: 'Payment Gateway', is_active: true },
  ],
  total: 2,
  page: 1,
  pages: 1,
};

export const mockDataSubjectCategories = {
  items: [
    { id: 1, name: 'ลูกค้า', description: 'ข้อมูลลูกค้าทั่วไป' },
    { id: 2, name: 'พนักงาน', description: 'ข้อมูลพนักงานภายในองค์กร' },
    { id: 3, name: 'ผู้สมัครงาน', description: 'ข้อมูลผู้สมัครงาน' },
  ],
  total: 3,
  page: 1,
  pages: 1,
};

export const mockPersonalDataTypes = {
  items: [
    { id: 1, name: 'ชื่อ-นามสกุล', sensitivity_level: 'general' },
    { id: 2, name: 'เลขบัตรประชาชน', sensitivity_level: 'sensitive' },
    { id: 3, name: 'อีเมล', sensitivity_level: 'general' },
    { id: 4, name: 'เบอร์โทรศัพท์', sensitivity_level: 'general' },
  ],
  total: 4,
  page: 1,
  pages: 1,
};

export const mockRopaRecords = {
  items: [
    {
      id: 1,
      activity_name: 'ระบบจัดการข้อมูลลูกค้า',
      purpose: 'เพื่อจัดเก็บและบริหารจัดการข้อมูลลูกค้า',
      status: 'approved',
      risk_level: 'Medium',
      role_type: 'Controller',
      legal_basis_thai: 'ฐานสัญญา (มาตรา 24(3))',
      department: { id: 1, name: 'IT Department', code: 'IT' },
      creator: { id: 1, name: 'Admin User', email: 'admin@triangle.com' },
      created_at: '2026-04-15T10:00:00',
      is_deleted: false,
    },
    {
      id: 2,
      activity_name: 'ระบบบริหารทรัพยากรบุคคล',
      purpose: 'เพื่อจัดการข้อมูลพนักงาน',
      status: 'pending_approval',
      risk_level: 'High',
      role_type: 'Controller',
      legal_basis_thai: 'ฐานสัญญา (มาตรา 24(3))',
      department: { id: 2, name: 'HR Department', code: 'HR' },
      creator: { id: 1, name: 'Admin User', email: 'admin@triangle.com' },
      created_at: '2026-04-20T14:30:00',
      is_deleted: false,
    },
    {
      id: 3,
      activity_name: 'ระบบการเงินและบัญชี',
      purpose: 'เพื่อจัดการข้อมูลทางการเงิน',
      status: 'rejected',
      risk_level: 'Low',
      role_type: 'Processor',
      legal_basis_thai: 'ฐานสัญญา (มาตรา 24(3))',
      department: { id: 3, name: 'Finance Department', code: 'FIN' },
      creator: { id: 1, name: 'Admin User', email: 'admin@triangle.com' },
      created_at: '2026-04-18T09:15:00',
      rejection_reason: 'ข้อมูล Legal Basis ไม่ครบถ้วน',
      is_deleted: false,
    },
  ],
  total: 3,
  page: 1,
  per_page: 20,
  pages: 1,
};

export const mockRopaRecordDetail = {
  id: 1,
  activity_name: 'ระบบจัดการข้อมูลลูกค้า',
  purpose: 'เพื่อจัดเก็บและบริหารจัดการข้อมูลลูกค้า',
  status: 'approved',
  risk_level: 'Medium',
  role_type: 'Controller',
  legal_basis_thai: 'ฐานสัญญา (มาตรา 24(3))',
  retention_period: '5 ปี',
  storage_type: 'Electronic',
  data_owner: 'ฝ่าย IT',
  department: { id: 1, name: 'IT Department', code: 'IT' },
  controller: { id: 1, name: 'Triangle Corporation' },
  creator: { id: 1, name: 'Admin User', email: 'admin@triangle.com' },
  approver: { id: 2, name: 'DPO User', email: 'dpo@triangle.com' },
  data_subjects: [
    { id: 1, name: 'ลูกค้า', description: 'ข้อมูลลูกค้าทั่วไป' },
  ],
  personal_data_types: [
    { id: 1, name: 'ชื่อ-นามสกุล', sensitivity_level: 'general' },
    { id: 3, name: 'อีเมล', sensitivity_level: 'general' },
    { id: 4, name: 'เบอร์โทรศัพท์', sensitivity_level: 'general' },
  ],
  created_at: '2026-04-15T10:00:00',
  approved_at: '2026-04-16T11:00:00',
  is_deleted: false,
};

export const mockPendingRecords = {
  items: [
    {
      id: 2,
      activity_name: 'ระบบบริหารทรัพยากรบุคคล',
      purpose: 'เพื่อจัดการข้อมูลพนักงาน',
      status: 'pending_approval',
      risk_level: 'High',
      role_type: 'Controller',
      legal_basis_thai: 'ฐานสัญญา (มาตรา 24(3))',
      department: { id: 2, name: 'HR Department', code: 'HR' },
      creator: { id: 1, name: 'Admin User', email: 'admin@triangle.com' },
      created_at: '2026-04-20T14:30:00',
      is_deleted: false,
      rejection_reason: null,
      edit_reason: null,
    },
  ],
  total: 1,
  page: 1,
  per_page: 100,
  pages: 1,
};

export const mockDashboardSummary = {
  total: 15,
  approved: 10,
  pending_approval: 3,
  rejected: 2,
  pending_edit_approval: 0,
  pending_delete_approval: 0,
  by_department: [
    { department: 'IT Department', count: 8 },
    { department: 'HR Department', count: 4 },
    { department: 'Finance Department', count: 3 },
  ],
  by_risk_level: [
    { risk_level: 'Low', count: 5 },
    { risk_level: 'Medium', count: 7 },
    { risk_level: 'High', count: 3 },
  ],
  by_legal_basis: [
    { legal_basis: 'ฐานสัญญา (มาตรา 24(3))', count: 10 },
    { legal_basis: 'ฐานความยินยอม (มาตรา 24(1))', count: 5 },
  ],
};

export const mockUsers = {
  items: [
    {
      id: 1,
      email: 'admin@triangle.com',
      name: 'Admin User',
      role: 'Admin',
      is_active: true,
    },
    {
      id: 2,
      email: 'dpo@triangle.com',
      name: 'DPO User',
      role: 'DPO',
      is_active: true,
    },
    {
      id: 3,
      email: 'user@triangle.com',
      name: 'Regular User',
      role: 'User',
      is_active: true,
    },
  ],
  total: 3,
  page: 1,
  pages: 1,
};

export const mockAuditLogs = {
  items: [
    {
      id: 1,
      action: 'CREATE',
      entity_type: 'ropa_record',
      entity_id: 1,
      user: { id: 1, name: 'Admin User', email: 'admin@triangle.com' },
      timestamp: '2026-04-15T10:00:00',
      details: { activity_name: 'ระบบจัดการข้อมูลลูกค้า' },
    },
    {
      id: 2,
      action: 'APPROVE',
      entity_type: 'ropa_record',
      entity_id: 1,
      user: { id: 2, name: 'DPO User', email: 'dpo@triangle.com' },
      timestamp: '2026-04-16T11:00:00',
      details: { status: 'approved' },
    },
  ],
  total: 2,
  page: 1,
  pages: 1,
};
