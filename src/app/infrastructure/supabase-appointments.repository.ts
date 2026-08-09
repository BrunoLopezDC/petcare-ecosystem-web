import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { VetAppointment } from '../core/models/vet-appointment.model';
import { AppointmentsRepository } from '../core/ports/appointments.repository';
import { getSupabaseClient } from '../core/supabase/supabase.client';

/**
 * Concrete adapter for the AppointmentsRepository port, backed by Supabase.
 * Uses the existing "vet_appointments" table (read policies already enabled).
 */
@Injectable({ providedIn: 'root' })
export class SupabaseAppointmentsRepository implements AppointmentsRepository {
  private readonly table = 'vet_appointments';

  listPending(): Observable<VetAppointment[]> {
    const today = new Date().toISOString().slice(0, 10);
    return from(
      getSupabaseClient()
        .from(this.table)
        .select('*')
        .eq('status', 'pendiente')
        .gte('appointment_date', today)
        .order('appointment_date', { ascending: true })
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data as VetAppointment[]) ?? [];
      })
    );
  }
}