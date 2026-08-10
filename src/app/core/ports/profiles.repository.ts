import { Observable } from 'rxjs';
import { Profile } from '../models/profile.model';

/** Puerto para leer y actualizar el perfil del usuario actual (auth.uid()). */
export abstract class ProfilesRepository {
  /** Trae el perfil cuyo id coincide con el usuario autenticado. */
  abstract getMine(): Observable<Profile | null>;

  /** Actualiza la fila propia del usuario en profiles (solo su propio id). */
  abstract updateMine(changes: Partial<Profile>): Observable<Profile | null>;

  /**
   * Trae todos los perfiles. Solo tiene éxito si quien llama es admin
   * (la política RLS is_admin() ya está en Supabase).
   */
  abstract listAll(): Observable<Profile[]>;

  /** Cambia el rol de un usuario. Solo funciona si quien ejecuta es admin. */
  abstract updateRole(userId: string, newRole: string): Observable<Profile | null>;

  /** Activa o desactiva una cuenta. Solo funciona si quien ejecuta es admin. */
  abstract toggleActive(userId: string, active: boolean): Observable<Profile | null>;

  /** Eliminación lógica: deleted_at=now() y active=false (no borra la fila). */
  abstract softDelete(userId: string): Observable<Profile | null>;
}