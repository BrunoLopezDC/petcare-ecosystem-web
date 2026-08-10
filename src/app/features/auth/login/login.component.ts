import { Component, inject, signal, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { from, map, Observable, Subscription } from 'rxjs';
import { Session } from '@supabase/supabase-js';

import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { Password } from 'primeng/password';

import { getSupabaseClient } from '../../../core/supabase/supabase.client';
import { SupabaseAuditLogRepository } from '../../../infrastructure/supabase-audit-log.repository';
import { ClientIpService } from '../../../core/services/client-ip.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [InputTextModule, PasswordModule, ButtonModule, MessageModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  private readonly router = inject(Router);
  private readonly auditRepository = inject(SupabaseAuditLogRepository);
  private readonly clientIpService = inject(ClientIpService);

  private readonly subscription = new Subscription();

  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);

  @ViewChild('emailInput') protected emailInput?: { nativeElement: HTMLInputElement };
  @ViewChild('passwordInput') protected passwordInput?: Password;

  constructor() {
    // Si ya hay una sesión activa, se salta el login y se va directo al panel.
    this.getSession().subscribe((session) => {
      if (session) {
        this.router.navigateByUrl('/');
      }
    });
  }

  login(event?: Event): void {
    event?.preventDefault();
    if (this.submitting()) {
      return;
    }
    const email = this.emailInput?.nativeElement.value.trim() ?? '';
    const password = this.passwordInput?.value ?? '';
    if (!email || !password) {
      this.error.set('Correo o contraseña incorrectos');
      return;
    }
    this.error.set(null);
    this.submitting.set(true);

    this.signIn(email, password).subscribe({
      next: ({ error }) => {
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
        this.submitting.set(false);
        this.error.set('Correo o contraseña incorrectos');
      }
    });
  }

  /** Registra el evento de auditoría 'login' con IP best-effort, sin bloquear
   *  la navegación: si el insert falla, solo se avisa por consola. */
  private recordLogin(): void {
    this.clientIpService.getPublicIp().then((ip) => {
      this.subscription.add(this.auditRepository.insert('login', undefined, ip).subscribe());
    });
  }

  private signIn(email: string, password: string) {
    return from(getSupabaseClient().auth.signInWithPassword({ email, password }));
  }

  private getSession(): Observable<Session | null> {
    return from(getSupabaseClient().auth.getSession()).pipe(
      map(({ data }) => data.session)
    );
  }
}