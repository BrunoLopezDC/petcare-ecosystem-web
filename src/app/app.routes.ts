import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    // Lazy-loaded para no inflar el bundle inicial.
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent)
  },
  {
    path: 'dom-demo',
    loadComponent: () =>
      import('./features/dom-demo/dom-demo.component').then((m) => m.DomDemoComponent)
  },
  {
    path: 'tareas',
    loadComponent: () =>
      import('./features/task-manager/task-manager.component').then((m) => m.TaskManagerComponent)
  },
  {
    path: '**',
    redirectTo: ''
  }
];