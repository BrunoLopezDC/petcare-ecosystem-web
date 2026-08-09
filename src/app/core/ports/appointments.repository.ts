import { Observable } from 'rxjs';
import { VetAppointment } from '../models/vet-appointment.model';

/** Puerto para consultar las citas veterinarias del sistema. */
export abstract class AppointmentsRepository {
  /**
   * Trae las citas pendientes a partir de hoy (status='pendiente',
   * appointment_date >= hoy), ordenadas por fecha ascendente.
   */
  abstract listPending(): Observable<VetAppointment[]>;
}