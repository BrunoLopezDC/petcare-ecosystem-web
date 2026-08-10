import { Injectable, inject, signal } from '@angular/core';
import { EMPTY, from, map, Observable, switchMap } from 'rxjs';
import { first, tap } from 'rxjs/operators';
import { Profile } from '../models/profile.model';
import { ProfilesRepository } from '../ports/profiles.repository';
import { SupabaseProfilesRepository } from '../../infrastructure/supabase-profiles.repository';
import { getSupabaseClient } from '../supabase/supabase.client';

/**
 * Estado global del perfil del usuario autenticado.
 * Expone un signal {@link current} que el resto de la app lee de forma
 * reactiva (sidebar, guards, perfil). Se sincroniza con el ciclo de sesión:
 * al hacer login (o al arrancar con sesión activa) consulta profiles por
 * auth.uid(), y al hacer logout se limpia.
 */
@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly repository: ProfilesRepository = inject(SupabaseProfilesRepository);

  /** Perfil del usuario actual; null cuando no hay sesión. */
  readonly current = signal<Profile | null>(null);

  /** true mientras se está consultando el perfil una vez. */
  readonly loading = signal(false);

  constructor() {
    // Carga inicial si el SPA abre con una sesión que ya existe.
    this.loadIfAuthenticated().subscribe();
    // Se recarga en cada cambio de sesión (login/logout).
    getSupabaseClient().auth.onAuthStateChange((_event) => {
      this.loadIfAuthenticated().subscribe();
    });
  }

  private loadIfAuthenticated(): Observable<void> {
    return from(getSupabaseClient().auth.getSession()).pipe(
      first(),
      switchMap(({ data }) => {
        const hasSession = Boolean(data.session);
        if (!hasSession) {
          this.current.set(null);
          return EMPTY;
        }
        this.loading.set(true);
        return this.repository.getMine().pipe(
          tap({
            next: (profile) => this.current.set(profile),
            error: () => this.current.set(null),
            complete: () => this.loading.set(false)
          }),
          map(() => undefined)
        );
      })
    );
  }
}