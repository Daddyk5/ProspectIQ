import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'Market Intelligence · ProspectIQ',
    loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
  },
  {
    path: 'leads',
    title: 'Lead Discovery · ProspectIQ',
    loadComponent: () => import('./features/leads/leads').then((m) => m.Leads),
  },
  {
    path: 'campaigns',
    title: 'Campaign Canvas · ProspectIQ',
    loadComponent: () => import('./features/campaigns/campaigns').then((m) => m.Campaigns),
  },
  {
    path: 'engine',
    title: 'AI Engine · ProspectIQ',
    loadComponent: () => import('./features/engine/engine').then((m) => m.Engine),
  },
  { path: '**', redirectTo: '' },
];
