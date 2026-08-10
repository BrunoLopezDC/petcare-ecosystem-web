import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { ProfileService } from '../services/profile.service';

/**
 * Permite pasar solo a usuarios con role 'admin'. Espera a que el perfil
 * esté cargado (ensureCurrent) para no redirigir prematuramente cuando se
 * entra directo a la ruta protegida con la sesión ya viva. Si el perfil no
 * es admin, se redirige al perfil propio.
 */
export const adminGuard: CanActivateFn = async () => {
  const router = inject(Router);
  const profileService = inject(ProfileService);

  const profile = await profileService.ensureCurrent();
  if (profile?.role === 'admin') {
    return true;
  }
  return router.createUrlTree(['/perfil']);
};