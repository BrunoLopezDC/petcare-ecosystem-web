import { Observable } from 'rxjs';
import { VetAppointment } from '../models/vet-appointment.model';

export interface VetAppointmentsRepository {
  listForPet(petId: string): Observable<VetAppointment[]>;
  create(appointment: Partial<VetAppointment>): Observable<VetAppointment>;
  update(id: string, changes: Partial<VetAppointment>): Observable<VetAppointment>;
  remove(id: string): Observable<void>;
}