import { Component, inject, signal, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { from, map, Observable } from 'rxjs';
import { Session } from '@supabase/supabase-js';

import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { Password } from 'primeng/password';

import { getSupabaseClient } from '../../../core/supabase/supabase.client';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [InputTextModule, PasswordModule, ButtonModule, MessageModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  private readonly router = inject(Router);

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
        this.router.navigateByUrl('/');
      },
      error: () => {
        this.submitting.set(false);
        this.error.set('Correo o contraseña incorrectos');
      }
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