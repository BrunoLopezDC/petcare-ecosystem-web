import { Observable } from 'rxjs';
import { Permission, RolePermission } from '../models/permission.model';

/**
 * Puerto para consultar y editar el catálogo de permisos por rol. Este módulo
 * NO cambia el comportamiento real de guards ni RLS: es el catálogo de
 * referencia que exige la actividad, y las decisiones de acceso hoy se basan
 * en el campo role de profiles (vía adminGuard), no en consultas dinámicas a
 * estas tablas en cada acción.
 */
export abstract class PermissionsRepository {
  /** Trae todas las filas del catálogo de permisos (key, description). */
  abstract listPermissions(): Observable<Permission[]>;

  /** Trae todas las asignaciones rol → permiso (role, permission_key). */
  abstract listRolePermissions(): Observable<RolePermission[]>;

  /**
   * Activa o revoca el permiso en un rol. Solo funciona si RLS lo permite
   * (política admin_write_role_permissions en Supabase).
   */
  abstract togglePermission(role: string, permissionKey: string, enabled: boolean): Observable<void>;
}