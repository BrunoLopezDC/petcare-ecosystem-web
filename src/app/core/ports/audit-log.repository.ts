import { Observable } from 'rxjs';
import { AuditLog } from '../models/audit-log.model';

/** Puerto para registrar y consultar eventos de auditoría. */
export abstract class AuditLogRepository {
  /** Inserta un registro de auditoría con user_id/email del usuario actual. */
  abstract insert(action: string, details?: unknown, ipAddress?: string | null): Observable<void>;

  /** Trae todos los registros, ordenados por created_at descendente. Solo
   *  tiene éxito si quien llama es admin (RLS admin_read_audit). */
  abstract listAll(): Observable<AuditLog[]>;
}