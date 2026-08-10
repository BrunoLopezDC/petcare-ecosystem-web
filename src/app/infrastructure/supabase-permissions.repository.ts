import { Injectable } from '@angular/core';
import { from, Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { Permission, RolePermission } from '../core/models/permission.model';
import { PermissionsRepository } from '../core/ports/permissions.repository';
import { getSupabaseClient } from '../core/supabase/supabase.client';

/**
 * Concrete adapter for the PermissionsRepository port, backed by Supabase.
 * Lee permissions y role_permissions (lectura abierta para admin vía RLS) y
 * edita role_permissions con insert/delete. El insert/delete solo tiene éxito
 * si quien llama es admin (política admin_write_role_permissions).
 */
@Injectable({ providedIn: 'root' })
export class SupabasePermissionsRepository implements PermissionsRepository {
  private readonly permissionsTable = 'permissions';
  private readonly rolePermissionsTable = 'role_permissions';

  listPermissions(): Observable<Permission[]> {
    return from(
      getSupabaseClient()
        .from(this.permissionsTable)
        .select('key, description')
        .order('key', { ascending: true })
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data as Permission[]) ?? [];
      })
    );
  }

  listRolePermissions(): Observable<RolePermission[]> {
    return from(getSupabaseClient().from(this.rolePermissionsTable).select('role, permission_key')).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data as RolePermission[]) ?? [];
      })
    );
  }

  togglePermission(role: string, permissionKey: string, enabled: boolean): Observable<void> {
    const request = enabled
      ? getSupabaseClient().from(this.rolePermissionsTable).insert({ role, permission_key: permissionKey })
      : getSupabaseClient()
          .from(this.rolePermissionsTable)
          .delete()
          .eq('role', role)
          .eq('permission_key', permissionKey);

    return from(request).pipe(
      switchMap(({ error }) => {
        if (error) throw error;
        return from([undefined]);
      })
    );
  }
}