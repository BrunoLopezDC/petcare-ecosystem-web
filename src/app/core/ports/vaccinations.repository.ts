import { Observable } from 'rxjs';
import { Vaccination } from '../models/vaccination.model';

export interface VaccinationsRepository {
  listForPet(petId: string): Observable<Vaccination[]>;
  create(vaccination: Partial<Vaccination>): Observable<Vaccination>;
  update(id: string, changes: Partial<Vaccination>): Observable<Vaccination>;
  remove(id: string): Observable<void>;
}