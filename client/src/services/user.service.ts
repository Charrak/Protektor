import api from './api';

export interface UserListItem {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: { id: string; name: string; slug: string };
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
}

export interface UserDetail extends UserListItem {
  role: {
    id: string;
    name: string;
    slug: string;
    permissions: Array<{ id: string; name: string; slug: string; module: string }>;
  };
  updatedAt: string;
}

export interface UserListResponse {
  users: UserListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface Role {
  id: string;
  name: string;
  slug: string;
  description?: string;
  isSystem: boolean;
  userCount: number;
  permissions: Array<{ id: string; slug: string; module: string }>;
}

export interface Permission {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

export type PermissionsByModule = Record<string, Permission[]>;

export const userService = {
  async list(params?: { search?: string; roleId?: string; isActive?: boolean; page?: number; limit?: number }): Promise<UserListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set('search', params.search);
    if (params?.roleId) searchParams.set('roleId', params.roleId);
    if (params?.isActive !== undefined) searchParams.set('isActive', String(params.isActive));
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));

    const { data } = await api.get<UserListResponse>(`/users?${searchParams}`);
    return data;
  },

  async getById(id: string): Promise<UserDetail> {
    const { data } = await api.get<UserDetail>(`/users/${id}`);
    return data;
  },

  async create(input: { username: string; email: string; password: string; firstName: string; lastName: string; roleId: string }): Promise<UserListItem> {
    const { data } = await api.post<UserListItem>('/users', input);
    return data;
  },

  async update(id: string, input: { email?: string; firstName?: string; lastName?: string; roleId?: string; isActive?: boolean }): Promise<UserListItem> {
    const { data } = await api.put<UserListItem>(`/users/${id}`, input);
    return data;
  },

  async resetPassword(id: string, newPassword: string): Promise<void> {
    await api.put(`/users/${id}/password`, { newPassword });
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/users/${id}`);
  },
};

export const roleService = {
  async list(): Promise<Role[]> {
    const { data } = await api.get<Role[]>('/roles');
    return data;
  },

  async getById(id: string): Promise<Role & { permissions: Array<{ id: string; name: string; slug: string; module: string }> }> {
    const { data } = await api.get(`/roles/${id}`);
    return data;
  },

  async create(input: { name: string; slug: string; description?: string }): Promise<Role> {
    const { data } = await api.post<Role>('/roles', input);
    return data;
  },

  async update(id: string, input: { name?: string; description?: string }): Promise<Role> {
    const { data } = await api.put<Role>(`/roles/${id}`, input);
    return data;
  },

  async setPermissions(roleId: string, permissionIds: string[]): Promise<void> {
    await api.put(`/roles/${roleId}/permissions`, { permissionIds });
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/roles/${id}`);
  },

  async listPermissions(): Promise<PermissionsByModule> {
    const { data } = await api.get<PermissionsByModule>('/roles/permissions');
    return data;
  },
};
