import { Observable } from 'rxjs';
import { WeightLog } from '../models/weight-log.model';

export interface WeightLogsRepository {
  listForPet(petId: string): Observable<WeightLog[]>;
  create(log: Partial<WeightLog>): Observable<WeightLog>;
  remove(id: string): Observable<void>;
}