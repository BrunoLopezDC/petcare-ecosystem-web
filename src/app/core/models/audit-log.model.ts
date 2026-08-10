export interface AuditLog {
  id: string;
  user_id: string;
  email?: string;
  action: string;
  details?: unknown | null;
  ip_address?: string | null;
  created_at?: string;
}