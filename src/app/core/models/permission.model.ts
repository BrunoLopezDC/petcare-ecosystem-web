export interface Permission {
  key: string;
  description?: string | null;
}

export interface RolePermission {
  role: string;
  permission_key: string;
}