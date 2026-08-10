import { inject, Injectable, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { from } from 'rxjs';

import { getSupabaseClient } from '../supabase/supabase.client';
import { SupabaseAuditLogRepository } from '../../infrastructure/supabase-audit-log.repository';

/**
 * Umbrales de inactividad. Se exponen como constantes para poder reducir el
 * tiempo durante pruebas E2E (p. ej. 30s) y luego regresarlos a 15 minutos.
 */
export const SESSION_TIMEOUT = {
  /** Tiempo sin actividad antes de cerrar la sesión. */
  inactivityMs: 15 * 60 * 1000,
  /** Cuánto antes de expirar se muestra la advertencia. */
  warningLeadMs: 60 * 1000,
  /** Debounce mínimo entre eventos de actividad "ruidosos" (p. ej. mousemove). */
  activityDebounceMs: 1000
};

/** Clave en sessionStorage para comunicarle al LoginComponent el motivo. */
export const SESSION_EXPIRED_MESSAGE_KEY = 'sessionExpiredMessage';

/**
 * Cierra la sesión automáticamente tras un periodo de inactividad. Escucha
 * eventos de actividad (click, keydown, mousemove —con debounce—) y, si no
 * hay movimiento durante {@link SESSION_TIMEOUT.inactivityMs}, hace signOut()
 * y redirige a /login con un mensaje informativo. Muestra una advertencia
 * {@link SESSION_TIMEOUT.warningLeadMs} antes de expirar con la opción
 * "Seguir conectado" que reinicia el temporizador.
 *
 * Solo se inicia cuando hay sesión activa y la ruta actual no es /login: en
 * la pantalla de login el servicio permanece detenido.
 */
@Injectable({ providedIn: 'root' })
export class SessionTimeoutService {
  private readonly router = inject(Router);
  private readonly auditRepository = inject(SupabaseAuditLogRepository);

  /** true cuando falta menos de un minuto para expirar (se muestra el aviso). */
  readonly warningVisible = signal(false);

  private sessionActive = false;
  private started = false;
  private lastActivity = Date.now();
  private warningTimer?: ReturnType<typeof setTimeout>;
  private expireTimer?: ReturnType<typeof setTimeout>;
  private readonly unlisten: Array<() => void> = [];

  constructor() {
    // Sincroniza con la sesión (login/logout en cualquier pestaña) y con la ruta.
    getSupabaseClient().auth.onAuthStateChange((_event, session) => {
      this.sessionActive = Boolean(session);
      this.refresh();
    });
    from(getSupabaseClient().auth.getSession()).subscribe(({ data }) => {
      this.sessionActive = Boolean(data.session);
      this.refresh();
    });
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      this.refresh();
    });
  }

  /** Reinicia el temporizador desde cero y oculta la advertencia (botón del aviso). */
  keepAlive(): void {
    if (!this.started) {
      return;
    }
    this.warningVisible.set(false);
    this.resetTimer();
  }

  private refresh(): void {
    const onLoginRoute = this.router.url.startsWith('/login');
    if (this.sessionActive && !onLoginRoute) {
      this.start();
    } else {
      this.stop();
    }
  }

  private start(): void {
    if (this.started) {
      return;
    }
    this.started = true;
    this.bindActivityListeners();
    this.resetTimer();
  }

  private stop(): void {
    if (!this.started) {
      return;
    }
    this.started = false;
    this.unlisten.forEach((fn) => fn());
    this.unlisten.length = 0;
    this.clearTimers();
    this.warningVisible.set(false);
  }

  /** Vuelve a armar los temporizadores desde "ahora". */
  private resetTimer(): void {
    this.clearTimers();
    this.lastActivity = Date.now();
    this.warningTimer = setTimeout(
      () => this.warningVisible.set(true),
      SESSION_TIMEOUT.inactivityMs - SESSION_TIMEOUT.warningLeadMs
    );
    this.expireTimer = setTimeout(() => this.expire(), SESSION_TIMEOUT.inactivityMs);
  }

  private clearTimers(): void {
    if (this.warningTimer) {
      clearTimeout(this.warningTimer);
    }
    if (this.expireTimer) {
      clearTimeout(this.expireTimer);
    }
    this.warningTimer = undefined;
    this.expireTimer = undefined;
  }

  /** Eventos de actividad con debounce para no disparar en cada píxel de mousemove. */
  private onActivity = (): void => {
    const now = Date.now();
    if (now - this.lastActivity < SESSION_TIMEOUT.activityDebounceMs) {
      return;
    }
    this.resetTimer();
  };

  private bindActivityListeners(): void {
    const listeners: Array<[keyof DocumentEventMap, EventListener]> = [
      ['click', this.onActivity],
      ['keydown', this.onActivity],
      ['mousemove', this.onActivity]
    ];
    listeners.forEach(([type, listener]) => {
      document.addEventListener(type, listener);
      this.unlisten.push(() => document.removeEventListener(type, listener));
    });
  }

  /** Cierra la sesión por inactividad y redirige a /login con un mensaje. */
  private expire(): void {
    this.stop();
    // El evento logout se registra ANTES de signOut (la sesión aún existe).
    this.auditRepository.insert('logout').subscribe();
    sessionStorage.setItem(
      SESSION_EXPIRED_MESSAGE_KEY,
      'Tu sesión expiró por inactividad. Inicia sesión de nuevo.'
    );
    getSupabaseClient()
      .auth.signOut()
      .finally(() => {
        this.router.navigateByUrl('/login');
      });
  }
}