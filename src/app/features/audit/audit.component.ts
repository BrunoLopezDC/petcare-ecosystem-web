import { Component, computed, inject, signal, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';

import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { DialogModule } from 'primeng/dialog';

import { AuditLog } from '../../core/models/audit-log.model';
import { AuditLogRepository } from '../../core/ports/audit-log.repository';
import { SupabaseAuditLogRepository } from '../../infrastructure/supabase-audit-log.repository';

type ActionOption = { label: string; value: string };

@Component({
  selector: 'app-audit',
  standalone: true,
  imports: [
    TableModule,
    TagModule,
    ButtonModule,
    MessageModule,
    ProgressSpinnerModule,
    CardModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    DialogModule
  ],
  templateUrl: './audit.component.html',
  styleUrls: ['./audit.component.scss']
})
export class AuditComponent {
  private readonly repo: AuditLogRepository = inject(SupabaseAuditLogRepository);
  private readonly subscription = new Subscription();

  protected readonly logs = signal<AuditLog[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  /** Filtro por tipo de acción seleccionado (null = todas). */
  protected readonly actionFilter = signal<string | null>(null);
  protected readonly searchText = signal('');
  protected readonly hasSearchFilter = computed(() => this.searchText().trim().length > 0);

  /** Registro cuyos details se muestran en el diálogo. */
  protected readonly detailLog = signal<AuditLog | null>(null);
  protected readonly dialogVisible = signal(false);

  /** Registros filtrados por tipo de acción (el buscador global por correo lo
   *  aplica p-table vía filterGlobal sobre globalFilterFields). */
  protected readonly visibleLogs = computed(() => {
    const action = this.actionFilter();
    if (!action) return this.logs();
    return this.logs().filter((log) => log.action === action);
  });

  protected readonly actionOptions: ActionOption[] = [
    { label: 'Inicio de sesión', value: 'login' },
    { label: 'Cierre de sesión', value: 'logout' },
    { label: 'Cambio de contraseña', value: 'password_change' },
    { label: 'Usuario creado', value: 'user_create' },
    { label: 'Usuario eliminado', value: 'user_delete' },
    { label: 'Cambio de rol', value: 'role_change' }
  ];

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.subscription.add(
      this.repo.listAll().subscribe({
        next: (data) => this.logs.set(data),
        error: () => {
          this.loading.set(false);
          this.error.set('No se pudieron cargar los registros de auditoría. Revisa tu conexión o inténtalo de nuevo.');
        },
        complete: () => this.loading.set(false)
      })
    );
  }

  /** Severidad del Tag según el tipo de acción. */
  actionSeverity(action: string): 'info' | 'secondary' | 'warn' | 'success' | 'danger' {
    switch (action) {
      case 'login':
        return 'info';
      case 'logout':
        return 'secondary';
      case 'password_change':
        return 'warn';
      case 'user_create':
        return 'success';
      case 'user_delete':
        return 'danger';
      case 'role_change':
        return 'warn';
      default:
        return 'secondary';
    }
  }

  actionLabel(action: string): string {
    const found = this.actionOptions.find((o) => o.value === action);
    return found?.label ?? action;
  }

  onActionFilterChange(value: unknown): void {
    this.actionFilter.set(value === '' || value == null ? null : String(value));
  }

  onSearchChange(table: any, value: string): void {
    this.searchText.set(value);
    if (table) {
      table.filterGlobal(value, 'contains');
    }
  }

  hasDetails(log: AuditLog): boolean {
    return log.details != null;
  }

  openDetail(log: AuditLog): void {
    this.detailLog.set(log);
    this.dialogVisible.set(true);
  }

  closeDetail(): void {
    this.dialogVisible.set(false);
    this.detailLog.set(null);
  }

  formatDateTime(value?: string): string {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  ipText(log: AuditLog): string {
    return log.ip_address || 'No disponible';
  }

  detailsJson(log: AuditLog): string {
    try {
      return JSON.stringify(log.details, null, 2);
    } catch {
      return String(log.details);
    }
  }
}