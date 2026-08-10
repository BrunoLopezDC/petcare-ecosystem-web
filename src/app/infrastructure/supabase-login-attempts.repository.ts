import { Injectable } from '@angular/core';
import { from, map, Observable } from 'rxjs';

import { LoginAttemptsRepository } from '../core/ports/login-attempts.repository';
import { getSupabaseClient } from '../core/supabase/supabase.client';

/**
 * Adaptador concreto del puerto LoginAttemptsRepository, respaldado por la
 * tabla login_attempts de Supabase (columnas: id, email, success,
 * attempted_at).
 *
 * Lectura y escritura usan únicamente la anon key: tanto la consulta de
 * bloqueo como el registro del resultado ocurren desde la pantalla de login,
 * donde NO hay sesión activa todavía.
 */
@Injectable({ providedIn: 'root' })
export class SupabaseLoginAttemptsRepository implements LoginAttemptsRepository {
  private readonly table = 'login_attempts';

  countRecentFailures(email: string, sinceIso: string): Observable<number> {
    return from(
      getSupabaseClient()
        .from(this.table)
        .select('id', { count: 'exact', head: true })
        .eq('email', email)
        .eq('success', false)
        .gte('attempted_at', sinceIso)
    ).pipe(
      map(({ count, error }) => {
        if (error) {
          throw error;
        }
        return count ?? 0;
      })
    );
  }

  recordAttempt(email: string, success: boolean): Observable<void> {
    return from(getSupabaseClient().from(this.table).insert({ email, success })).pipe(
      map(({ error }) => {
        if (error) {
          console.error('[login_attempts] No se pudo registrar el intento', email, error.message);
        }
      })
    );
  }
}