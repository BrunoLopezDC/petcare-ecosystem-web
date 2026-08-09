import { Observable } from 'rxjs';
import { Pet } from '../models/pet.model';

export interface PetsRepository {
  list(): Observable<Pet[]>;
  get(id: string): Observable<Pet | null>;
  create(pet: Partial<Pet>): Observable<Pet>;
  update(id: string, changes: Partial<Pet>): Observable<Pet>;
  remove(id: string): Observable<void>;
}