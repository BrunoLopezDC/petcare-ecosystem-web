import { Component, OnDestroy, signal, computed, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';

import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { Menu } from 'primeng/menu';
import { MenuItem } from 'primeng/api';

import { Pet } from '../../core/models/pet.model';
import { VetAppointment } from '../../core/models/vet-appointment.model';
import { PetsRepository } from '../../core/ports/pets.repository';
import { AppointmentsRepository } from '../../core/ports/appointments.repository';
import { SupabasePetsRepository } from '../../infrastructure/supabase-pets.repository';
import { SupabaseAppointmentsRepository } from '../../infrastructure/supabase-appointments.repository';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [TableModule, DialogModule, MessageModule, ProgressSpinnerModule, ButtonModule, TagModule, SkeletonModule, CardModule, InputTextModule, IconFieldModule, InputIconModule, Menu],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnDestroy {
  // Se consume el PUERTO (PetsRepository); el adaptador concreto se inyecta vía DI.
  // El componente de features nunca llama a supabase-js directamente.
  private readonly repo: PetsRepository;
  private readonly appointmentsRepo: AppointmentsRepository;

  private readonly subscription = new Subscription();

  protected readonly pets = signal<Pet[]>([]);
  protected readonly selectedPet = signal<Pet | null>(null);
  protected readonly dialogVisible = signal(false);
  protected readonly searchText = signal('');

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  /** Próxima cita veterinaria pendiente (la más cercana a partir de hoy). */
  protected readonly nextAppointment = signal<VetAppointment | null>(null);
  /** Días de ventana para considerarla "próxima" (a 7 días vista). */
  private readonly nextAppointmentWindowDays = 7;

  // Ítems del menú overlay de acciones por fila. El "Ver detalle" lanza el
  // mismo diálogo existente (openDetail), sin duplicar la lógica.
  protected readonly rowActionItems: MenuItem[] = [
    {
      label: 'Ver detalle',
      icon: 'pi pi-eye',
      command: () => {
        const pet = this.rowMenuPet();
        if (pet) {
          this.openDetail(pet);
        }
      }
    }
  ];

  /** Mascota de la fila cuyo menú de acciones está abierto. */
  protected readonly rowMenuPet = signal<Pet | null>(null);

  /** Referencia al popup <p-menu> de la fila. */
  @ViewChild('rowMenu') protected rowMenu?: Menu;

  // Indica si hay un filtro de búsqueda activo
  protected readonly hasSearchFilter = computed(() => this.searchText().trim().length > 0);

  /** Estado y mensaje del banner según la próxima cita pendiente. */
  protected readonly banner = computed(() => {
    const appt = this.nextAppointment();
    // DEBUG: imprimir la condición exacta que se evalúa.
    if (appt) {
      const whenDebug = appt.appointment_date ? new Date(appt.appointment_date).getTime() : NaN;
      const msDiff = Number.isNaN(whenDebug) ? NaN : whenDebug - Date.now();
      const daysDiff = Number.isNaN(msDiff)
        ? 'N/A'
        : Math.ceil(msDiff / 86_400_000);
      const inWindow = this.isWithinDays(appt.appointment_date, this.nextAppointmentWindowDays);
      console.log('[banner] nextAppointment EXISTE:', appt);
      console.log(`[banner] appointment_date=${appt.appointment_date} | días de diferencia (ceil) ≈ ${daysDiff} | rango=7d | dentroDeRango=${inWindow}`);
    } else {
      console.log('[banner] nextAppointment es NULL -> condición FALSE');
    }
    if (appt && this.isWithinDays(appt.appointment_date, this.nextAppointmentWindowDays)) {
      const when = this.formatDate(appt.appointment_date);
      return {
        severity: 'warn' as const,
        text: `Tienes una cita veterinaria próxima: ${appt.reason ?? 'consulta veterinaria'} el ${when}`
      };
    }
    const count = this.pets().length;
    return {
      severity: 'info' as const,
      text: `Bienvenido al panel — actualmente hay ${count} mascot${count === 1 ? '' : 's'} registrada${count === 1 ? '' : 's'}`
    };
  });

  constructor(repo: SupabasePetsRepository, appointmentsRepo: SupabaseAppointmentsRepository) {
    this.repo = repo;
    this.appointmentsRepo = appointmentsRepo;
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.subscription.add(
      this.repo.list().subscribe({
        next: (data) => this.pets.set(data),
        error: () => {
          this.loading.set(false);
          this.error.set(
            'No se pudo conectar con la fuente de datos. Revisa tu conexión o inténtalo de nuevo.'
          );
        },
        complete: () => this.loading.set(false)
      })
    );

    // La próxima cita no debe romper el panel si la consulta falla.
    this.subscription.add(
      this.appointmentsRepo.listPending().subscribe({
        next: (items) => {
          // DEBUG: imprimir el array completo que devuelve listPending()
          console.log('[listPending] array recibido de Supabase:', items);
          console.log('[listPending] cantidad de elementos:', items?.length ?? 0);
          this.nextAppointment.set(items[0] ?? null);
          console.log('[nextAppointment] valor asignado al signal:', items?.[0] ?? null);
        },
        error: () => {
          console.error('[listPending] ERROR de Supabase:', arguments);
          this.nextAppointment.set(null);
        }
      })
    );
  }

  openDetail(pet: Pet): void {
    this.selectedPet.set(pet);
    this.dialogVisible.set(true);
  }

  /** Abre el menú overlay de acciones de una fila. */
  openRowMenu(event: Event, pet: Pet): void {
    event.stopPropagation();
    this.rowMenuPet.set(pet);
    this.rowMenu?.toggle(event);
  }

  closeDetail(): void {
    this.dialogVisible.set(false);
  }

  onSearchChange(table: any, value: string): void {
    this.searchText.set(value);
    if (table) {
      table.filterGlobal(value, 'contains');
    }
  }

  /** Indica si una fecha cae dentro de los próximos N días (hoy inclusive). */
  private isWithinDays(date?: string, days?: number): boolean {
    if (!date) return false;
    const target = new Date(date);
    if (Number.isNaN(target.getTime())) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const limit = new Date(today);
    limit.setDate(limit.getDate() + (days ?? 0));

    target.setHours(0, 0, 0, 0);
    return target >= today && target <= limit;
  }

  formatDate(value?: string): string {
    if (!value) return '—';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}