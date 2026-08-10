import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { ProfileService } from '../services/profile.service';

/**
 * Permite pasar solo a usuarios con role 'admin'. Se usa a partir de la
 * Fase C2 (gestión de usuarios). Si el perfil aún se está cargando o no es
 * admin, se redirige al perfil propio (o al dashboard como fallback).
 */
export const adminGuard: CanActivateFn = () => {
  const router = inject(Router);
  const profileService = inject(ProfileService);
  const profile = profileService.current();

  if (profile?.role === 'admin') {
    return true;
  }
  return router.createUrlTree(['/perfil']);
};