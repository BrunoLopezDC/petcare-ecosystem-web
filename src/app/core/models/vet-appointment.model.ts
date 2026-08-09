export interface VetAppointment {
  id: string;
  pet_id: string;
  appointment_date?: string;
  reason?: string;
  status?: string;
  created_at?: string;
}