import { Component, inject, signal, ViewChild } from '@angular/core';
import { from } from 'rxjs';

import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { Password } from 'primeng/password';

import { ProfileService } from '../../core/services/profile.service';
import { SupabaseProfilesRepository } from '../../infrastructure/supabase-profiles.repository';
import { SupabaseAuditLogRepository } from '../../infrastructure/supabase-audit-log.repository';
import { getSupabaseClient } from '../../core/supabase/supabase.client';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [InputTextModule, PasswordModule, ButtonModule, MessageModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent {
  private readonly profileService = inject(ProfileService);
  private readonly repository = inject(SupabaseProfilesRepository);
  private readonly auditRepository = inject(SupabaseAuditLogRepository);

  protected readonly current = this.profileService.current;
  protected readonly loading = this.profileService.loading;

  protected readonly savingName = signal(false);
  protected readonly savingPassword = signal(false);
  protected readonly nameFeedback = signal<string | null>(null);
  protected readonly passwordFeedback = signal<string | null>(null);
  protected readonly nameError = signal<boolean>(false);
  protected readonly passwordError = signal<boolean>(false);

  @ViewChild('nameInput') protected nameInput?: { nativeElement: HTMLInputElement };
  @ViewChild('newPasswordInput') protected newPasswordInput?: Password;
  @ViewChild('confirmPasswordInput') protected confirmPasswordInput?: Password;

  saveName(event?: Event): void {
    event?.preventDefault();
    if (this.savingName()) {
      return;
    }
    const fullName = this.nameInput?.nativeElement.value.trim() ?? '';
    if (!fullName) {
      this.nameFeedback.set('El nombre no puede quedar vacío.');
      this.nameError.set(true);
      return;
    }
    this.nameError.set(false);
    this.savingName.set(true);
    this.repository.updateMine({ full_name: fullName }).subscribe({
      next: (profile) => {
        if (profile) {
          this.profileService.current.set(profile);
        }
        this.savingName.set(false);
        this.nameFeedback.set('Cambios guardados.');
      },
      error: () => {
        this.savingName.set(false);
        this.nameFeedback.set('No se pudieron guardar los cambios.');
        this.nameError.set(true);
      }
    });
  }

  savePassword(event?: Event): void {
    event?.preventDefault();
    if (this.savingPassword()) {
      return;
    }
    const newPassword = this.newPasswordInput?.value ?? '';
    const confirmation = this.confirmPasswordInput?.value ?? '';
    if (newPassword.length < 8) {
      this.passwordFeedback.set('La contraseña debe tener al menos 8 caracteres.');
      this.passwordError.set(true);
      return;
    }
    if (newPassword !== confirmation) {
      this.passwordFeedback.set('Las contraseñas no coinciden.');
      this.passwordError.set(true);
      return;
    }
    this.passwordError.set(false);
    this.savingPassword.set(true);
    from(getSupabaseClient().auth.updateUser({ password: newPassword })).subscribe({
      next: ({ error }) => {
        this.savingPassword.set(false);
        if (error) {
          this.passwordFeedback.set('No se pudo cambiar la contraseña.');
          this.passwordError.set(true);
          return;
        }
        this.passwordFeedback.set('Contraseña actualizada.');
        if (this.newPasswordInput) {
          this.newPasswordInput.value = '';
        }
        if (this.confirmPasswordInput) {
          this.confirmPasswordInput.value = '';
        }
        // Auditoría best-effort: si el insert falla, el usuario no se entera
        // (solo se registra en consola) y el cambio de contraseña prevalece.
        this.auditRepository.insert('password_change').subscribe();
      },
      error: () => {
        this.savingPassword.set(false);
        this.passwordFeedback.set('No se pudo cambiar la contraseña.');
        this.passwordError.set(true);
      }
    });
  }
}