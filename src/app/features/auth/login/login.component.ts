import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { from, map } from 'rxjs';

import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';

import { getSupabaseClient } from '../../../core/supabase/supabase.client';
import { SupabaseAuditLogRepository } from '../../../infrastructure/supabase-audit-log.repository';
import { ClientIpService } from '../../../core/services/client-ip.service';
import { LoginAttemptsRepository } from '../../../core/ports/login-attempts.repository';
import { SupabaseLoginAttemptsRepository } from '../../../infrastructure/supabase-login-attempts.repository';
import { SESSION_EXPIRED_MESSAGE_KEY } from '../../../core/services/session-timeout.service';

const FAILURE_WINDOW_MS = 15 * 60 * 1000;
/** Máximo de intentos fallidos permitidos dentro de la ventana. */
const MAX_FAILURES = 5;

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, InputTextModule, PasswordModule, ButtonModule, MessageModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  private readonly router = inject(Router);
  private readonly auditRepository = inject(SupabaseAuditLogRepository);
  private readonly clientIpService = inject(ClientIpService);
  private readonly loginAttemptsRepository = inject<LoginAttemptsRepository>(
    SupabaseLoginAttemptsRepository
  );

  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly info = signal<string | null>(null);

  /** Formulario reactivo: el botón de submit se deshabilita mientras sea inválido. */
  protected readonly form = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required, Validators.minLength(8)])
  });

  constructor() {
    // Mensaje informativo dejado por el timeout de inactividad (si aplica).
    const sessionExpiredMessage = sessionStorage.getItem(SESSION_EXPIRED_MESSAGE_KEY);
    if (sessionExpiredMessage) {
      sessionStorage.removeItem(SESSION_EXPIRED_MESSAGE_KEY);
      this.info.set(sessionExpiredMessage);
    }
    // Si ya hay una sesión activa, se salta el login y se va directo al panel.
    this.getSession().subscribe((session) => {
      if (session) {
        this.router.navigateByUrl('/');
      }
    });
  }

  login(event?: Event): void {
    event?.preventDefault();
    if (this.submitting() || this.form.invalid) {
      return;
    }
    const email = (this.form.controls.email.value ?? '').trim();
    const password = this.form.controls.password.value ?? '';

    this.error.set(null);

    // CONTROL 4 (bloqueo por intentos fallidos):
    //
    // LIMITACIÓN CONOCIDA: este bloqueo vive en la SPA (control del lado del
    // cliente). Como web-pet no tiene backend propio, cualquier persona que
    // llame directamente a la API de Supabase (auth.signInWithPassword) sin
    // pasar por esta pantalla podría saltarse este bloqueo. Es un control
    // real y útil para el flujo normal del navegador, pero NO es infalible
    // dado el tipo de arquitectura (SPA + Supabase). Una mitigación robusta
    // requeriría una política en el servidor (edge/ban por IP o rate limit).
    const since = new Date(Date.now() - FAILURE_WINDOW_MS).toISOString();
    this.loginAttemptsRepository.countRecentFailures(email, since).subscribe({
      next: (failures) => {
        if (failures >= MAX_FAILURES) {
          // 5+ fallos recientes: NO se intenta el login en absoluto.
          this.error.set(
            'Cuenta bloqueada temporalmente por múltiples intentos fallidos. Intenta de nuevo en unos minutos.'
          );
          return;
        }
        this.attemptSignIn(email, password);
      },
      error: () => {
        // Si la consulta previa falla (red, RLS), se deja pasar y se registra
        // la falla del intento igualmente: un problema del control no debe
        // bloquear por accidente a un usuario legítimo.
        console.error('[login] No se pudo consultar login_attempts; se continúa sin bloqueo.');
        this.attemptSignIn(email, password);
      }
    });
  }

  /** Ejecuta el intento real y registra su resultado en login_attempts. */
  private attemptSignIn(email: string, password: string): void {
    this.submitting.set(true);
    this.signIn(email, password).subscribe({
      next: ({ error }) => {
        // Se registra el resultado (éxito o fallo) tras CADA intento real.
        this.recordAttempt(email, !error);
        if (error) {
          this.submitting.set(false);
          // No se revela si falló el correo o la contraseña (por seguridad).
          this.error.set('Correo o contraseña incorrectos');
          return;
        }
        this.recordLogin();
        this.router.navigateByUrl('/');
      },
      error: () => {
        this.recordAttempt(email, false);
        this.submitting.set(false);
        this.error.set('Correo o contraseña incorrectos');
      }
    });
  }

  /** Registra el intento en login_attempts (best-effort, nunca bloquea). */
  private recordAttempt(email: string, success: boolean): void {
    this.loginAttemptsRepository.recordAttempt(email, success).subscribe();
  }

  /** Registra el evento de auditoría 'login' con IP best-effort, sin bloquear
   *  la navegación: si el insert falla, solo se avisa por consola. */
  private recordLogin(): void {
    this.clientIpService.getPublicIp().then((ip) => {
      this.auditRepository.insert('login', undefined, ip).subscribe();
    });
  }

  private signIn(email: string, password: string) {
    return from(getSupabaseClient().auth.signInWithPassword({ email, password }));
  }

  private getSession() {
    return from(getSupabaseClient().auth.getSession()).pipe(map(({ data }) => data.session));
  }
}