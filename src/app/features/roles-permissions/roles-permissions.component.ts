import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';

import { Permission } from '../../core/models/permission.model';
import { PermissionsRepository } from '../../core/ports/permissions.repository';
import { SupabasePermissionsRepository } from '../../infrastructure/supabase-permissions.repository';

type RoleColumn = { key: string; label: string };

@Component({
  selector: 'app-roles-permissions',
  standalone: true,
  imports: [FormsModule, CardModule, MessageModule, ProgressSpinnerModule, ButtonModule, CheckboxModule],
  templateUrl: './roles-permissions.component.html',
  styleUrls: ['./roles-permissions.component.scss']
})
export class RolesPermissionsComponent {
  private readonly repo: PermissionsRepository = inject(SupabasePermissionsRepository);
  private readonly subscription = new Subscription();

  protected readonly permissions = signal<Permission[]>([]);
  /** Conjunto de pares "role:permission_key" activos. */
  protected readonly active = signal<Set<string>>(new Set());

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  /** Permisos que se están guardando en este momento (clave role:permission_key). */
  protected readonly savingKeys = signal<Set<string>>(new Set());

  protected readonly roles: RoleColumn[] = [
    { key: 'admin', label: 'Admin' },
    { key: 'user', label: 'Usuario' }
  ];

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.subscription.add(
      this.repo.listPermissions().subscribe({
        next: (perms) => {
          this.permissions.set(perms);
          this.subscription.add(
            this.repo.listRolePermissions().subscribe({
              next: (assignments) => {
                const set = new Set<string>();
                assignments.forEach((a) => set.add(this.keyOf(a.role, a.permission_key)));
                this.active.set(set);
              },
              error: () => {
                this.loading.set(false);
                this.error.set('No se pudieron cargar los permisos. Revisa tu conexión o inténtalo de nuevo.');
              },
              complete: () => this.loading.set(false)
            })
          );
        },
        error: () => {
          this.loading.set(false);
          this.error.set('No se pudieron cargar los permisos. Revisa tu conexión o inténtalo de nuevo.');
        }
      })
    );
  }

  protected keyOf(role: string, permissionKey: string): string {
    return `${role}:${permissionKey}`;
  }

  has(role: string, permissionKey: string): boolean {
    return this.active().has(this.keyOf(role, permissionKey));
  }

  isSaving(role: string, permissionKey: string): boolean {
    return this.savingKeys().has(this.keyOf(role, permissionKey));
  }

  /** El checkbox cambió: persiste el nuevo estado de inmediato (edición en tiempo real). */
  onToggle(role: string, permission: Permission, checked: boolean): void {
    const key = this.keyOf(role, permission.key);

    // Optimismo: actualiza la UI al instante para no esperar a la red.
    this.active.update((set) => {
      const next = new Set(set);
      if (checked) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });

    this.savingKeys.update((set) => new Set(set).add(key));
    this.subscription.add(
      this.repo.togglePermission(role, permission.key, checked).subscribe({
        next: () => {
          this.savingKeys.update((set) => {
            const next = new Set(set);
            next.delete(key);
            return next;
          });
        },
        error: () => {
          this.savingKeys.update((set) => {
            const next = new Set(set);
            next.delete(key);
            return next;
          });
          // Revertir el cambio optimista si la operación falló (p. ej. RLS).
          this.active.update((set) => {
            const next = new Set(set);
            if (checked) {
              next.delete(key);
            } else {
              next.add(key);
            }
            return next;
          });
          this.error.set('No se pudo actualizar el permiso. Revisa tus permisos de administrador.');
        }
      })
    );
  }
}