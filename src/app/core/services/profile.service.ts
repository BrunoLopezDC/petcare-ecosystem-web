import { Injectable, inject, signal } from '@angular/core';
import { EMPTY, from, map, Observable, Subject, switchMap, firstValueFrom } from 'rxjs';
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

  /** Emite cuando termina cada intento de carga del perfil (para guards). */
  private readonly loaded$ = new Subject<void>();

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

  /**
   * Devuelve una promesa con el perfil actual, esperando (con tope de 3s) a
   * que termine la carga en curso. Sirve para guards que deciden según el rol
   * (p. ej. adminGuard) y que pueden ejecutarse antes de que el perfil esté
   * listo en una carga directa de la ruta.
   */
  async ensureCurrent(): Promise<Profile | null> {
    if (this.current() !== null) {
      return this.current();
    }
    const session = await firstValueFrom(from(getSupabaseClient().auth.getSession()));
    if (!session.data.session) {
      return null;
    }
    if (this.current() !== null) {
      return this.current();
    }
    return Promise.race([
      firstValueFrom(this.loaded$).then(() => this.current()),
      new Promise<Profile | null>((resolve) => setTimeout(() => resolve(this.current()), 3000))
    ]);
  }

  private loadIfAuthenticated(): Observable<void> {
    return from(getSupabaseClient().auth.getSession()).pipe(
      first(),
      switchMap(({ data }) => {
        const hasSession = Boolean(data.session);
        if (!hasSession) {
          this.current.set(null);
          this.loaded$.next();
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