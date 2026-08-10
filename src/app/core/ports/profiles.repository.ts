import { Observable } from 'rxjs';
import { Profile } from '../models/profile.model';

/** Puerto para leer y actualizar el perfil del usuario actual (auth.uid()). */
export abstract class ProfilesRepository {
  /** Trae el perfil cuyo id coincide con el usuario autenticado. */
  abstract getMine(): Observable<Profile | null>;

  /** Actualiza la fila propia del usuario en profiles (solo su propio id). */
  abstract updateMine(changes: Partial<Profile>): Observable<Profile | null>;
}