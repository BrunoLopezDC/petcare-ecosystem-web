import { Component, computed, inject, signal, ViewChild, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';

import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { SelectModule } from 'primeng/select';
import { DialogModule } from 'primeng/dialog';
import { Menu } from 'primeng/menu';
import { MenuItem } from 'primeng/api';

import { Profile } from '../../core/models/profile.model';
import { ProfilesRepository } from '../../core/ports/profiles.repository';
import { SupabaseProfilesRepository } from '../../infrastructure/supabase-profiles.repository';
import { ProfileService } from '../../core/services/profile.service';

type RoleOption = { label: string; value: string };

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    TableModule,
    TagModule,
    ButtonModule,
    MessageModule,
    ProgressSpinnerModule,
    CardModule,
    InputTextModule,
    CheckboxModule,
    SelectModule,
    DialogModule,
    Menu
  ],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss']
})
export class UsersComponent implements OnDestroy {
  private readonly repo: ProfilesRepository = inject(SupabaseProfilesRepository);
  private readonly profileService = inject(ProfileService);

  private readonly subscription = new Subscription();

  /** Conjunto completo de perfiles (incluye eliminados lógicamente). */
  protected readonly allUsers = signal<Profile[]>([]);
  /** Si se activa, se muestran también los perfiles con deleted_at no nulo. */
  protected readonly showDeleted = signal(false);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly saving = signal(false);

  /** Fila cuyo menú de acciones está abierto. */
  protected readonly rowMenuUser = signal<Profile | null>(null);
  @ViewChild('rowMenu') protected rowMenu?: Menu;

  /** Diálogos. Un único estado con "kind" y el usuario objetivo. */
  protected readonly roleDialog = signal<{ visible: boolean; user: Profile | null; role: string }>({
    visible: false,
    user: null,
    role: 'user'
  });
  protected readonly toggleDialog = signal<{ visible: boolean; user: Profile | null }>({
    visible: false,
    user: null
  });
  protected readonly deleteDialog = signal<{ visible: boolean; user: Profile | null }>({
    visible: false,
    user: null
  });

  protected readonly roles: RoleOption[] = [
    { label: 'Admin', value: 'admin' },
    { label: 'Usuario', value: 'user' }
  ];

  /** Perfiles visibles: por defecto se ocultan los eliminados lógicamente. */
  protected readonly visibleUsers = computed<Profile[]>(() => {
    const show = this.showDeleted();
    return this.allUsers().filter((u) => show || !u.deleted_at);
  });

  /** El id del usuario autenticado para evitar autogestión desde esta pantalla. */
  protected get currentUserId(): string | undefined {
    return this.profileService.current()?.id;
  }

  protected readonly rowActionItems = computed<MenuItem[]>(() => {
    const user = this.rowMenuUser();
    if (!user) return [];
    const isSelf = user.id === this.currentUserId;
    return [
      {
        label: 'Cambiar rol',
        icon: 'pi pi-user-edit',
        disabled: isSelf,
        command: () => this.openRoleDialog(user)
      },
      {
        label: user.active ? 'Desactivar' : 'Activar',
        icon: user.active ? 'pi pi-power-off' : 'pi pi-power-on',
        disabled: isSelf,
        command: () => this.openToggleDialog(user)
      },
      {
        label: 'Eliminar',
        icon: 'pi pi-trash',
        disabled: isSelf,
        command: () => this.openDeleteDialog(user)
      }
    ];
  });

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.subscription.add(
      this.repo.listAll().subscribe({
        next: (data) => this.allUsers.set(data),
        error: () => {
          this.loading.set(false);
          this.error.set('No se pudieron cargar los usuarios. Revisa tu conexión o inténtalo de nuevo.');
        },
        complete: () => this.loading.set(false)
      })
    );
  }

  /** Indica si una fila corresponde al usuario actualmente autenticado. */
  isSelf(user: Profile): boolean {
    return user.id === this.currentUserId;
  }

  /** Indica si el perfil fue eliminado lógicamente (deleted_at != null). */
  isDeleted(user: Profile): boolean {
    return Boolean(user.deleted_at);
  }

  formatDate(value?: string | null): string {
    if (!value) return '—';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
  }

  openRowMenu(event: Event, user: Profile): void {
    event.stopPropagation();
    this.rowMenuUser.set(user);
    this.rowMenu?.toggle(event);
  }

  // --- Cambiar rol ---

  openRoleDialog(user: Profile): void {
    this.roleDialog.set({ visible: true, user, role: user.role ?? 'user' });
  }

  onRoleChange(value: unknown): void {
    const role = String(value ?? 'user');
    this.roleDialog.update((state) => ({ ...state, role }));
  }

  confirmRoleChange(): void {
    const { user, role } = this.roleDialog();
    if (!user || this.saving()) return;
    this.saving.set(true);
    this.subscription.add(
      this.repo.updateRole(user.id, role).subscribe({
        next: () => {
          this.saving.set(false);
          this.roleDialog.set({ visible: false, user: null, role: 'user' });
          this.load();
        },
        error: () => {
          this.saving.set(false);
          this.error.set('No se pudo cambiar el rol. Revisa que tengas permisos de administrador.');
        }
      })
    );
  }

  cancelRoleChange(): void {
    this.roleDialog.set({ visible: false, user: null, role: 'user' });
  }

  // --- Activar / Desactivar ---

  openToggleDialog(user: Profile): void {
    this.toggleDialog.set({ visible: true, user });
  }

  confirmToggle(): void {
    const { user } = this.toggleDialog();
    if (!user || this.saving()) return;
    this.saving.set(true);
    this.subscription.add(
      this.repo.toggleActive(user.id, !user.active).subscribe({
        next: () => {
          this.saving.set(false);
          this.toggleDialog.set({ visible: false, user: null });
          this.load();
        },
        error: () => {
          this.saving.set(false);
          this.error.set('No se pudo cambiar el estado de la cuenta.');
        }
      })
    );
  }

  cancelToggle(): void {
    this.toggleDialog.set({ visible: false, user: null });
  }

  // --- Eliminar (lógica) ---

  openDeleteDialog(user: Profile): void {
    this.deleteDialog.set({ visible: true, user });
  }

  confirmDelete(): void {
    const { user } = this.deleteDialog();
    if (!user || this.saving()) return;
    this.saving.set(true);
    this.subscription.add(
      this.repo.softDelete(user.id).subscribe({
        next: () => {
          this.saving.set(false);
          this.deleteDialog.set({ visible: false, user: null });
          this.load();
        },
        error: () => {
          this.saving.set(false);
          this.error.set('No se pudo eliminar la cuenta.');
        }
      })
    );
  }

  cancelDelete(): void {
    this.deleteDialog.set({ visible: false, user: null });
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}