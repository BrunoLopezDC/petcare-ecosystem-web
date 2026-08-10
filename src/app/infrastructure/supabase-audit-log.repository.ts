import { Injectable } from '@angular/core';
import { from, Observable, switchMap, map } from 'rxjs';
import { AuditLog } from '../core/models/audit-log.model';
import { AuditLogRepository } from '../core/ports/audit-log.repository';
import { getSupabaseClient } from '../core/supabase/supabase.client';

/**
 * Concrete adapter for the AuditLogRepository port, backed by Supabase.
 * Inserta en audit_log con user_id/email tomados de la sesión actual. La
 * tabla tiene RLS: solo el propio usuario inserta su fila y solo admin lee.
 *
 * El insert es best-effort: quien lo invoca (login/logout/cambio de
 * contraseña) NO debe bloquearse si esto falla; por eso los métodos nunca
 * lanzan hacia el llamador, solo registran el error en consola.
 */
@Injectable({ providedIn: 'root' })
export class SupabaseAuditLogRepository implements AuditLogRepository {
  private readonly table = 'audit_log';

  insert(action: string, details?: unknown, ipAddress?: string | null): Observable<void> {
    return from(getSupabaseClient().auth.getSession()).pipe(
      switchMap(({ data }) => {
        const uid = data.session?.user.id;
        const email = data.session?.user.email ?? null;
        if (!uid) {
          console.warn('[audit] Sin sesión activa; se omite el registro de auditoría:', action);
          return from([undefined]);
        }
        const row = { user_id: uid, email, action, details: details ?? null, ip_address: ipAddress ?? null };
        return from(getSupabaseClient().from(this.table).insert(row)).pipe(
          map(({ error }) => {
            if (error) {
              console.error('[audit] No se pudo registrar el evento', action, error.message);
            }
          })
        );
      })
    );
  }

  listAll(): Observable<AuditLog[]> {
    return from(
      getSupabaseClient().from(this.table).select('*').order('created_at', { ascending: false })
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data as AuditLog[]) ?? [];
      })
    );
  }
}