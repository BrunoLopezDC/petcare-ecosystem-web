import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { ViewEncapsulation } from '@angular/core';
import { PanelMenu } from 'primeng/panelmenu';
import { MenuItem } from 'primeng/api';
import { filter } from 'rxjs';

import { getSupabaseClient } from './core/supabase/supabase.client';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, PanelMenu],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  // ViewEncapsulation.None para que el CSS del layout alcance también a los
  // nodos internos de <p-panelmenu> (que viven en su propio ámbito, fuera de
  // "aplicar" un hash de Angular en el template padre).
  encapsulation: ViewEncapsulation.None,
  standalone: true
})
export class App {
  private readonly router = inject(Router);

  protected readonly panelName = signal('Panel de Mascotas');
  protected readonly collapsed = signal(false);
  /** True cuando la ruta activa es /login: el shell oculta sidebar y paddings. */
  protected readonly isLoginRoute = signal(false);

  constructor() {
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      this.isLoginRoute.set(this.router.url.startsWith('/login'));
    });
  }

  // Modelo de datos que espera <p-panelmenu>. El estado activo lo marca el
  // propio componente con routerLinkActive (coincidencia exacta por ruta).
  protected readonly navItems = signal<MenuItem[]>([
    { label: 'Mascotas', icon: 'pi pi-user', routerLink: '/', routerLinkActiveOptions: { exact: true } },
    { label: 'Interactividad', icon: 'pi pi-code', routerLink: '/dom-demo', routerLinkActiveOptions: { exact: true } },
    { label: 'Tareas', icon: 'pi pi-check-square', routerLink: '/tareas', routerLinkActiveOptions: { exact: true } },
    { label: 'Mi perfil', icon: 'pi pi-user-edit', routerLink: '/perfil', routerLinkActiveOptions: { exact: true } }
  ]);

  toggleSidebar(): void {
    this.collapsed.update((value) => !value);
  }

  logout(): void {
    getSupabaseClient().auth.signOut().finally(() => {
      this.router.navigateByUrl('/login');
    });
  }
}