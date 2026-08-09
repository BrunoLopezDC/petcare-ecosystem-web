export interface CareLog {
  id: string;
  pet_id: string;
  type: string;
  note?: string;
  occurred_at?: string;
  created_at?: string;
}