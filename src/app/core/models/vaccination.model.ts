export interface Vaccination {
  id: string;
  pet_id: string;
  name: string;
  administered_at?: string;
  next_due_at?: string;
  notes?: string;
  created_at?: string;
}