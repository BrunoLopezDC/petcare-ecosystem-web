import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then((m) => m.LoginComponent)
  },
  {
    path: '',
    pathMatch: 'full',
    canActivate: [authGuard],
    // Lazy-loaded para no inflar el bundle inicial.
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent)
  },
  {
    path: 'dom-demo',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dom-demo/dom-demo.component').then((m) => m.DomDemoComponent)
  },
  {
    path: 'tareas',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/task-manager/task-manager.component').then((m) => m.TaskManagerComponent)
  },
  {
    path: 'perfil',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/profile/profile.component').then((m) => m.ProfileComponent)
  },
  {
    path: '**',
    redirectTo: ''
  }
];