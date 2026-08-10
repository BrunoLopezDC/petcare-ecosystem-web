import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { getSupabaseClient } from '../supabase/supabase.client';

export const authGuard: CanActivateFn = async () => {
  const router = inject(Router);
  const { data } = await getSupabaseClient().auth.getSession();
  if (data.session) {
    return true;
  }
  return router.createUrlTree(['/login']);
};