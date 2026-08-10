import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { Profile } from '../core/models/profile.model';
import { ProfilesRepository } from '../core/ports/profiles.repository';
import { getSupabaseClient } from '../core/supabase/supabase.client';

/**
 * Concrete adapter for the ProfilesRepository port, backed by Supabase.
 * Uses the existing "profiles" table, filtered siempre por auth.uid().
 * El trigger prevent_role_escalation protege role/active de edits no-admin,
 * así que updateMine puede actualizar sin problema el full_name propio.
 *
 * Los métodos administrativos (listAll/updateRole/toggleActive/softDelete)
 * solo tienen éxito cuando el llamador es admin, gracias a la política RLS
 * is_admin() y al trigger prevent_role_escalation ya presentes en Supabase.
 */
@Injectable({ providedIn: 'root' })
export class SupabaseProfilesRepository implements ProfilesRepository {
  private readonly table = 'profiles';

  private currentUid(): Observable<string> {
    return from(getSupabaseClient().auth.getSession()).pipe(
      map(({ data }) => data.session?.user.id ?? '')
    );
  }

  getMine(): Observable<Profile | null> {
    return this.currentUid().pipe(
      switchMap((uid) => {
        if (!uid) {
          return from([null]);
        }
        return from(
          getSupabaseClient()
            .from(this.table)
            .select('*')
            .eq('id', uid)
            .maybeSingle()
        ).pipe(
          map(({ data, error }) => {
            if (error) throw error;
            return (data as Profile) ?? null;
          })
        );
      })
    );
  }

  updateMine(changes: Partial<Profile>): Observable<Profile | null> {
    return this.currentUid().pipe(
      switchMap((uid) => {
        if (!uid) {
          throw new Error('No hay sesión activa');
        }
        return from(
          getSupabaseClient()
            .from(this.table)
            .update(changes)
            .eq('id', uid)
            .select('*')
            .maybeSingle()
        ).pipe(
          map(({ data, error }) => {
            if (error) throw error;
            return (data as Profile) ?? null;
          })
        );
      })
    );
  }

  listAll(): Observable<Profile[]> {
    return from(getSupabaseClient().from(this.table).select('*')).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data as Profile[]) ?? [];
      })
    );
  }

  updateRole(userId: string, newRole: string): Observable<Profile | null> {
    return from(
      getSupabaseClient()
        .from(this.table)
        .update({ role: newRole })
        .eq('id', userId)
        .select('*')
        .maybeSingle()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data as Profile) ?? null;
      })
    );
  }

  toggleActive(userId: string, active: boolean): Observable<Profile | null> {
    return from(
      getSupabaseClient()
        .from(this.table)
        .update({ active })
        .eq('id', userId)
        .select('*')
        .maybeSingle()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data as Profile) ?? null;
      })
    );
  }

  softDelete(userId: string): Observable<Profile | null> {
    const softDeleted = { deleted_at: new Date().toISOString(), active: false };
    return from(
      getSupabaseClient()
        .from(this.table)
        .update(softDeleted)
        .eq('id', userId)
        .select('*')
        .maybeSingle()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data as Profile) ?? null;
      })
    );
  }
}