import { Component, inject, signal, ViewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { from } from 'rxjs';

import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';

import { ProfileService } from '../../core/services/profile.service';
import { SupabaseProfilesRepository } from '../../infrastructure/supabase-profiles.repository';
import { SupabaseAuditLogRepository } from '../../infrastructure/supabase-audit-log.repository';
import { getSupabaseClient } from '../../core/supabase/supabase.client';
import { passwordPolicyValidator, passwordRules, PasswordRule } from '../../core/validators/password-policy.validator';
import { mustMatchValidator } from '../../core/validators/must-match.validator';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [ReactiveFormsModule, InputTextModule, PasswordModule, ButtonModule, MessageModule],
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

  /** Requisitos de la política de contraseña con su estado, para el checklist. */
  protected readonly passwordRequirements = signal<PasswordRule[]>(passwordRules(''));

  /** Formulario reactivo de cambio de contraseña (política + confirmación). */
  protected readonly passwordForm = new FormGroup(
    {
      newPassword: new FormControl('', [Validators.required, passwordPolicyValidator()]),
      confirmPassword: new FormControl('', [Validators.required])
    },
    { validators: mustMatchValidator('newPassword', 'confirmPassword') }
  );

  @ViewChild('nameInput') protected nameInput?: { nativeElement: HTMLInputElement };

  constructor() {
    // El checklist se actualiza en tiempo real conforme se escribe.
    this.passwordForm.controls.newPassword.valueChanges.subscribe((value) => {
      this.passwordRequirements.set(passwordRules(value ?? ''));
    });
    // Estado inicial de la confirmación: si un valor ya escrito cambia y deja
    // de coincidir, el validador del grupo marca mustMatch en el momento.
    this.passwordForm.controls.confirmPassword.valueChanges.subscribe(() => {
      this.passwordForm.controls.confirmPassword.updateValueAndValidity({ onlySelf: true, emitEvent: false });
    });
  }

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
    if (this.savingPassword() || this.passwordForm.invalid) {
      return;
    }
    const newPassword = this.passwordForm.controls.newPassword.value ?? '';
    const confirmation = this.passwordForm.controls.confirmPassword.value ?? '';
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
        this.passwordError.set(false);
        this.passwordForm.reset();
        this.passwordRequirements.set(passwordRules(''));
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