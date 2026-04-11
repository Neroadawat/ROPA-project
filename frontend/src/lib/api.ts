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

export { ApiError };
