export interface Profile {
  id: string;
  email?: string;
  full_name?: string | null;
  role?: string;
  active?: boolean;
  deleted_at?: string | null;
  created_at?: string;
}