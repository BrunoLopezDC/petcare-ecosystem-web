import { Observable } from 'rxjs';
import { CareLog } from '../models/care-log.model';

export interface CareLogsRepository {
  listForPet(petId: string): Observable<CareLog[]>;
  create(log: Partial<CareLog>): Observable<CareLog>;
  remove(id: string): Observable<void>;
}