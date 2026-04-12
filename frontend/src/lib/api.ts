const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
    this.detail = detail;
  }
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let detail = "เกิดข้อผิดพลาด";
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch {}

    if (res.status === 401) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }

    throw new ApiError(res.status, detail);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// ─── Auth ───
export interface LoginPayload {
  email: string;
  password: string;
}

export interface UserData {
  id: number;
  email: string;
  name: string;
  role: string;
  department_id: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: UserData;
}

export const authApi = {
  login: (data: LoginPayload) =>
    request<LoginResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  logout: () =>
    request<{ message: string }>("/api/auth/logout", { method: "POST" }),
  me: () => request<UserData>("/api/auth/me"),
  changePassword: (data: { current_password: string; new_password: string }) =>
    request<{ message: string }>("/api/auth/change-password", {
      method: "PUT",
      body: JSON.stringify(data),
    }),
};

// ─── Paginated Response ───
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
}

// ─── Users ───
export interface UserCreatePayload {
  email: string;
  name: string;
  password: string;
  role: string;
  department_id?: number | null;
}

export interface UserUpdatePayload {
  name?: string;
  role?: string;
  department_id?: number | null;
  is_active?: boolean;
}

export const usersApi = {
  list: (params?: { page?: number; per_page?: number; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set("page", String(params.page));
    if (params?.per_page) q.set("per_page", String(params.per_page));
    if (params?.search) q.set("search", params.search);
    return request<PaginatedResponse<UserData>>(
      `/api/users?${q.toString()}`
    );
  },
  get: (id: number) => request<UserData>(`/api/users/${id}`),
  create: (data: UserCreatePayload) =>
    request<UserData>("/api/users", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: number, data: UserUpdatePayload) =>
    request<UserData>(`/api/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  deactivate: (id: number) =>
    request<UserData>(`/api/users/${id}`, { method: "DELETE" }),
};

// ─── Departments ───
export interface DepartmentData {
  id: number;
  name: string;
  code: string;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface DepartmentCreatePayload {
  name: string;
  code: string;
}

export interface DepartmentUpdatePayload {
  name?: string;
  code?: string;
  is_active?: boolean;
}

export const departmentsApi = {
  list: (params?: { page?: number; per_page?: number }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set("page", String(params.page));
    if (params?.per_page) q.set("per_page", String(params.per_page));
    return request<PaginatedResponse<DepartmentData>>(
      `/api/departments?${q.toString()}`
    );
  },
  create: (data: DepartmentCreatePayload) =>
    request<DepartmentData>("/api/departments", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: number, data: DepartmentUpdatePayload) =>
    request<DepartmentData>(`/api/departments/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    request<void>(`/api/departments/${id}`, { method: "DELETE" }),
};

// ─── Audit Logs ───
export interface AuditLogData {
  id: number;
  user_id: number;
  action: string;
  table_name: string;
  record_id: number;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  reason: string | null;
  created_at: string;
}

export const auditLogsApi = {
  list: (params?: {
    page?: number;
    per_page?: number;
    user_id?: number;
    action?: string;
    table_name?: string;
    date_from?: string;
    date_to?: string;
  }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set("page", String(params.page));
    if (params?.per_page) q.set("per_page", String(params.per_page));
    if (params?.user_id) q.set("user_id", String(params.user_id));
    if (params?.action) q.set("action", params.action);
    if (params?.table_name) q.set("table_name", params.table_name);
    if (params?.date_from) q.set("date_from", params.date_from);
    if (params?.date_to) q.set("date_to", params.date_to);
    return request<PaginatedResponse<AuditLogData>>(
      `/api/audit-logs?${q.toString()}`
    );
  },
};

// ─── User Session Logs ───
export interface UserSessionLogData {
  id: number;
  user_id: number;
  action: string;
  ip_address: string | null;
  created_at: string;
}

export const userLogsApi = {
  list: (params?: {
    page?: number;
    per_page?: number;
    user_id?: number;
    action?: string;
    date_from?: string;
    date_to?: string;
  }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set("page", String(params.page));
    if (params?.per_page) q.set("per_page", String(params.per_page));
    if (params?.user_id) q.set("user_id", String(params.user_id));
    if (params?.action) q.set("action", params.action);
    if (params?.date_from) q.set("date_from", params.date_from);
    if (params?.date_to) q.set("date_to", params.date_to);
    return request<PaginatedResponse<UserSessionLogData>>(
      `/api/user-logs?${q.toString()}`
    );
  },
};

// ─── Controllers ───
export interface ControllerData {
  id: number;
  name: string;
  address: string | null;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface ControllerCreatePayload {
  name: string;
  address?: string;
  email?: string;
  phone?: string;
}

export interface ControllerUpdatePayload {
  name?: string;
  address?: string;
  email?: string;
  phone?: string;
  is_active?: boolean;
}

export const controllersApi = {
  list: (params?: { page?: number; per_page?: number; include_inactive?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set("page", String(params.page));
    if (params?.per_page) q.set("per_page", String(params.per_page));
    if (params?.include_inactive) q.set("include_inactive", "true");
    return request<PaginatedResponse<ControllerData>>(`/api/controllers?${q.toString()}`);
  },
  create: (data: ControllerCreatePayload) =>
    request<ControllerData>("/api/controllers", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: ControllerUpdatePayload) =>
    request<ControllerData>(`/api/controllers/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deactivate: (id: number) =>
    request<void>(`/api/controllers/${id}`, { method: "DELETE" }),
};

// ─── Processors ───
export interface ProcessorData {
  id: number;
  name: string;
  source_controller_id: number | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  data_category: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface ProcessorCreatePayload {
  name: string;
  source_controller_id: number;
  address?: string;
  email?: string;
  phone?: string;
  data_category?: string;
}

export interface ProcessorUpdatePayload {
  name?: string;
  source_controller_id?: number;
  address?: string;
  email?: string;
  phone?: string;
  data_category?: string;
  is_active?: boolean;
}

export const processorsApi = {
  list: (params?: { page?: number; per_page?: number; include_inactive?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set("page", String(params.page));
    if (params?.per_page) q.set("per_page", String(params.per_page));
    if (params?.include_inactive) q.set("include_inactive", "true");
    return request<PaginatedResponse<ProcessorData>>(`/api/processors?${q.toString()}`);
  },
  create: (data: ProcessorCreatePayload) =>
    request<ProcessorData>("/api/processors", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: ProcessorUpdatePayload) =>
    request<ProcessorData>(`/api/processors/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deactivate: (id: number) =>
    request<void>(`/api/processors/${id}`, { method: "DELETE" }),
};

// ─── Master Data ───
export interface DataSubjectCategoryData {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
}

export interface PersonalDataTypeData {
  id: number;
  name: string;
  category: string | null;
  sensitivity_level: string | null;
  created_at: string;
}

export const masterDataApi = {
  listDataSubjectCategories: (params?: { page?: number; per_page?: number }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set("page", String(params.page));
    if (params?.per_page) q.set("per_page", String(params.per_page));
    return request<PaginatedResponse<DataSubjectCategoryData>>(`/api/master-data/data-subject-categories?${q.toString()}`);
  },
  createDataSubjectCategory: (data: { name: string; description?: string }) =>
    request<DataSubjectCategoryData>("/api/master-data/data-subject-categories", { method: "POST", body: JSON.stringify(data) }),
  updateDataSubjectCategory: (id: number, data: { name?: string; description?: string }) =>
    request<DataSubjectCategoryData>(`/api/master-data/data-subject-categories/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteDataSubjectCategory: (id: number) =>
    request<void>(`/api/master-data/data-subject-categories/${id}`, { method: "DELETE" }),

  listPersonalDataTypes: (params?: { page?: number; per_page?: number }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set("page", String(params.page));
    if (params?.per_page) q.set("per_page", String(params.per_page));
    return request<PaginatedResponse<PersonalDataTypeData>>(`/api/master-data/personal-data-types?${q.toString()}`);
  },
  createPersonalDataType: (data: { name: string; category?: string; sensitivity_level?: string }) =>
    request<PersonalDataTypeData>("/api/master-data/personal-data-types", { method: "POST", body: JSON.stringify(data) }),
  updatePersonalDataType: (id: number, data: { name?: string; category?: string; sensitivity_level?: string }) =>
    request<PersonalDataTypeData>(`/api/master-data/personal-data-types/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deletePersonalDataType: (id: number) =>
    request<void>(`/api/master-data/personal-data-types/${id}`, { method: "DELETE" }),
};

// ─── ROPA Records ───
export interface DepartmentBrief { id: number; name: string; code: string; }
export interface UserBrief { id: number; name: string; email: string; }
export interface ControllerBrief { id: number; name: string; }
export interface ProcessorBrief { id: number; name: string; source_controller_id: number | null; }
export interface DataSubjectCategoryBrief { id: number; name: string; }
export interface PersonalDataTypeBrief { id: number; name: string; category: string | null; sensitivity_level: string | null; }

export interface RopaRecordListItem {
  id: number;
  department: DepartmentBrief;
  creator: UserBrief;
  role_type: string;
  status: string;
  process_name: string | null;
  activity_name: string | null;
  risk_level: string | null;
  legal_basis_thai: string | null;
  retention_expiry_date: string | null;
  next_review_date: string | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface PaginatedRopaList {
  items: RopaRecordListItem[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export interface RopaRecordDetail {
  id: number;
  department_id: number;
  department: DepartmentBrief;
  created_by: number;
  creator: UserBrief;
  role_type: string;
  status: string;
  rejection_reason: string | null;
  approved_by: number | null;
  approver: UserBrief | null;
  approved_at: string | null;
  is_deleted: boolean;
  controller_id: number | null;
  controller: ControllerBrief | null;
  processor_id: number | null;
  processor: ProcessorBrief | null;
  data_subjects: DataSubjectCategoryBrief[];
  personal_data_types: PersonalDataTypeBrief[];
  process_name: string | null;
  activity_name: string | null;
  purpose: string | null;
  risk_level: string | null;
  data_acquisition_method: string | null;
  data_source_direct: string | null;
  data_source_other: string | null;
  legal_basis_thai: string | null;
  legal_basis_gdpr: string | null;
  minor_consent_under_10: string | null;
  minor_consent_10_20: string | null;
  cross_border_transfer: boolean | null;
  cross_border_affiliate: string | null;
  cross_border_method: string | null;
  cross_border_standard: string | null;
  cross_border_exception: string | null;
  retention_period: string | null;
  retention_expiry_date: string | null;
  next_review_date: string | null;
  storage_type: string | null;
  storage_method: string | null;
  access_rights: string | null;
  deletion_method: string | null;
  data_owner: string | null;
  third_party_recipients: string | null;
  disclosure_exemption: string | null;
  rights_refusal: string | null;
  security_organizational: string | null;
  security_technical: string | null;
  security_physical: string | null;
  security_access_control: string | null;
  security_responsibility: string | null;
  security_audit: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface RopaRecordCreatePayload {
  department_id: number;
  role_type: string;
  controller_id?: number | null;
  processor_id?: number | null;
  data_subject_category_ids?: number[];
  personal_data_type_ids?: number[];
  process_name?: string;
  activity_name?: string;
  purpose?: string;
  risk_level?: string;
  data_acquisition_method?: string;
  data_source_direct?: string;
  data_source_other?: string;
  legal_basis_thai?: string;
  legal_basis_gdpr?: string;
  minor_consent_under_10?: string;
  minor_consent_10_20?: string;
  cross_border_transfer?: boolean;
  cross_border_affiliate?: string;
  cross_border_method?: string;
  cross_border_standard?: string;
  cross_border_exception?: string;
  retention_period?: string;
  retention_expiry_date?: string;
  next_review_date?: string;
  storage_type?: string;
  storage_method?: string;
  access_rights?: string;
  deletion_method?: string;
  data_owner?: string;
  third_party_recipients?: string;
  disclosure_exemption?: string;
  rights_refusal?: string;
  security_organizational?: string;
  security_technical?: string;
  security_physical?: string;
  security_access_control?: string;
  security_responsibility?: string;
  security_audit?: string;
  reason?: string;
}

export interface RopaRecordUpdatePayload extends Omit<RopaRecordCreatePayload, 'department_id' | 'role_type' | 'reason'> {
  role_type?: string;
  reason: string;
}

export const ropaRecordsApi = {
  list: (params?: {
    page?: number; per_page?: number; search?: string;
    department_id?: number; role_type?: string; risk_level?: string;
    legal_basis?: string; status?: string; sort_by?: string; sort_order?: string;
  }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set("page", String(params.page));
    if (params?.per_page) q.set("per_page", String(params.per_page));
    if (params?.search) q.set("search", params.search);
    if (params?.department_id) q.set("department_id", String(params.department_id));
    if (params?.role_type) q.set("role_type", params.role_type);
    if (params?.risk_level) q.set("risk_level", params.risk_level);
    if (params?.legal_basis) q.set("legal_basis", params.legal_basis);
    if (params?.status) q.set("status", params.status);
    if (params?.sort_by) q.set("sort_by", params.sort_by);
    if (params?.sort_order) q.set("sort_order", params.sort_order);
    return request<PaginatedRopaList>(`/api/ropa-records?${q.toString()}`);
  },
  get: (id: number) => request<RopaRecordDetail>(`/api/ropa-records/${id}`),
  create: (data: RopaRecordCreatePayload) =>
    request<RopaRecordDetail>("/api/ropa-records", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: RopaRecordUpdatePayload) =>
    request<RopaRecordDetail>(`/api/ropa-records/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: number, reason: string) =>
    request<RopaRecordDetail>(`/api/ropa-records/${id}`, { method: "DELETE", body: JSON.stringify({ reason }) }),

  // Approval
  listPending: (params?: { page?: number; per_page?: number }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set("page", String(params.page));
    if (params?.per_page) q.set("per_page", String(params.per_page));
    return request<PaginatedRopaList>(`/api/ropa-records/pending?${q.toString()}`);
  },
  approve: (id: number) =>
    request<RopaRecordDetail>(`/api/ropa-records/${id}/approve`, { method: "POST", body: JSON.stringify({}) }),
  reject: (id: number, rejection_reason: string) =>
    request<RopaRecordDetail>(`/api/ropa-records/${id}/reject`, { method: "POST", body: JSON.stringify({ rejection_reason }) }),

  // Version History
  listVersions: (recordId: number, params?: { page?: number; per_page?: number }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set("page", String(params.page));
    if (params?.per_page) q.set("per_page", String(params.per_page));
    return request<PaginatedResponse<RecordVersionData>>(`/api/ropa-records/${recordId}/versions?${q.toString()}`);
  },
  getVersion: (recordId: number, versionId: number) =>
    request<RecordVersionData>(`/api/ropa-records/${recordId}/versions/${versionId}`),
  compareVersions: (recordId: number, versionId1: number, versionId2: number) =>
    request<VersionCompareData>(`/api/ropa-records/${recordId}/versions/compare?version_id_1=${versionId1}&version_id_2=${versionId2}`),

  // Retention Alerts
  getRetentionAlerts: (params?: { urgency?: string; department_id?: number }) => {
    const q = new URLSearchParams();
    if (params?.urgency) q.set("urgency", params.urgency);
    if (params?.department_id) q.set("department_id", String(params.department_id));
    return request<RetentionAlertData>(`/api/ropa-records/retention-alerts?${q.toString()}`);
  },
};

// ─── Version History Types ───
export interface RecordVersionData {
  id: number;
  ropa_record_id: number;
  version_number: number;
  snapshot: Record<string, unknown>;
  changed_by: number;
  changer: UserBrief;
  change_reason: string | null;
  created_at: string;
}

export interface VersionChangeData {
  field: string;
  old_value: string | null;
  new_value: string | null;
}

export interface VersionCompareData {
  version_1: RecordVersionData;
  version_2: RecordVersionData;
  changes: VersionChangeData[];
}

// ─── Retention Alerts Types ───
export interface RetentionAlertItem {
  id: number;
  process_name: string | null;
  activity_name: string | null;
  department_name: string;
  retention_expiry_date: string | null;
  next_review_date: string | null;
  urgency: string;
}

export interface RetentionAlertData {
  overdue: RetentionAlertItem[];
  within_30: RetentionAlertItem[];
  within_60_90: RetentionAlertItem[];
  review_overdue: RetentionAlertItem[];
}

// ─── Dashboard ───
export interface DashboardSummary {
  total: number;
  by_department: { department: string; count: number }[];
  by_risk_level: { risk_level: string; count: number }[];
  by_legal_basis: { legal_basis: string; count: number }[];
}

export interface DashboardCompleteness {
  average_completeness_pct: number;
  records: { record_id: number; activity_name: string | null; filled: number; total: number; completeness_pct: number }[];
}

export interface DashboardTrends {
  monthly_trends: { year: number; month: number; count: number }[];
}

export interface DashboardRiskHeatmap {
  heatmap: { department: string; data_type: string; risk_level: string; count: number }[];
}

export interface DashboardComplianceScores {
  scores: { department_id: number; department: string; record_count: number; completeness_pct: number; legal_basis_coverage_pct: number; compliance_score: number }[];
}

export interface DashboardStatusOverview {
  statuses: Record<string, number>;
}

export interface DashboardSensitiveDataMapping {
  mapping: { department: string; sensitive_data_count: number }[];
}

export interface DashboardRetentionAlertsSummary {
  overdue: number;
  within_30: number;
  within_60_90: number;
  review_overdue: number;
}

export const dashboardApi = {
  summary: () => request<DashboardSummary>("/api/dashboard/summary"),
  completeness: () => request<DashboardCompleteness>("/api/dashboard/completeness"),
  trends: () => request<DashboardTrends>("/api/dashboard/trends"),
  riskHeatmap: () => request<DashboardRiskHeatmap>("/api/dashboard/risk-heatmap"),
  complianceScores: () => request<DashboardComplianceScores>("/api/dashboard/compliance-scores"),
  statusOverview: () => request<DashboardStatusOverview>("/api/dashboard/status-overview"),
  sensitiveDataMapping: () => request<DashboardSensitiveDataMapping>("/api/dashboard/sensitive-data-mapping"),
  retentionAlerts: () => request<DashboardRetentionAlertsSummary>("/api/dashboard/retention-alerts"),
};

// ─── Suggestions ───
export interface SuggestionItem {
  legal_basis: string;
  confidence: number;
  reasoning: string;
  pdpa_section: string;
  caution: string | null;
  matched_keywords: string[];
}

export interface SuggestResponse {
  suggestions: SuggestionItem[];
  input_summary: string;
  engine_version: string;
  fallback: boolean;
  detail: string | null;
}

export interface SuggestionLogData {
  id: number;
  user_id: number;
  ropa_record_id: number | null;
  input_activity_name: string | null;
  input_purpose: string | null;
  suggestions: Record<string, unknown> | null;
  selected_legal_basis: string | null;
  accepted: boolean | null;
  engine_version: string | null;
  created_at: string;
}

export const suggestionsApi = {
  getLegalBasis: (data: { activity_name: string; purpose: string }) =>
    request<SuggestResponse>("/api/suggestions/legal-basis", { method: "POST", body: JSON.stringify(data) }),
  listLogs: (params?: { page?: number; per_page?: number; user_id?: number }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set("page", String(params.page));
    if (params?.per_page) q.set("per_page", String(params.per_page));
    if (params?.user_id) q.set("user_id", String(params.user_id));
    return request<PaginatedResponse<SuggestionLogData>>(`/api/suggestions/legal-basis/logs?${q.toString()}`);
  },
};

// ─── Import/Export ───
export interface ImportRowError {
  sheet_name: string;
  row_number: number;
  field_name: string;
  error_reason: string;
}

export interface ImportPreviewData {
  valid_rows: Record<string, unknown>[];
  errors: ImportRowError[];
  total_rows: number;
  valid_count: number;
  error_count: number;
}

export interface ImportBatchData {
  id: number;
  imported_by: number;
  filename: string;
  rows_success: number;
  rows_failed: number;
  status: string;
  error_details: Record<string, unknown> | null;
  created_at: string;
}

async function requestFile<T>(path: string, file: File): Promise<T> {
  const token = getToken();
  const formData = new FormData();
  formData.append("file", file);
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { method: "POST", headers, body: formData });
  if (!res.ok) {
    let detail = "เกิดข้อผิดพลาด";
    try { const body = await res.json(); detail = body.detail || detail; } catch {}
    if (res.status === 401) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    throw new ApiError(res.status, detail);
  }
  return res.json();
}

export const importApi = {
  preview: (file: File) => requestFile<ImportPreviewData>("/api/import/preview", file),
  confirm: (file: File) => requestFile<ImportBatchData>("/api/import/confirm", file),
  listBatches: (params?: { page?: number; per_page?: number }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set("page", String(params.page));
    if (params?.per_page) q.set("per_page", String(params.per_page));
    return request<PaginatedResponse<ImportBatchData>>(`/api/import/batches?${q.toString()}`);
  },
};

export const exportApi = {
  excel: async () => {
    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}/api/export/excel`, { headers });
    if (!res.ok) {
      let detail = "เกิดข้อผิดพลาด";
      try { const body = await res.json(); detail = body.detail || detail; } catch {}
      throw new ApiError(res.status, detail);
    }
    return res.blob();
  },
};

export { ApiError };
