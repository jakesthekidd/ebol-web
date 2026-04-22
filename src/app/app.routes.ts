import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { ShellComponent } from './core/layout/shell.component';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./features/home/home.component').then((m) => m.HomeComponent),
      },
      {
        path: 'repository',
        loadComponent: () =>
          import('./features/repository/repository.component').then((m) => m.RepositoryComponent),
      },
      {
        path: 'locations',
        loadComponent: () =>
          import('./features/locations/locations.component').then((m) => m.LocationsComponent),
      },
      {
        path: 'upload',
        loadComponent: () =>
          import('./features/bols/upload/upload.component').then((m) => m.UploadComponent),
      },
      {
        path: 'shipments/new',
        loadComponent: () =>
          import('./features/shipments/new/shipment-new.component').then(
            (m) => m.ShipmentNewComponent,
          ),
      },
      {
        path: 'shipments/:shipmentId',
        loadComponent: () =>
          import('./features/shipments/viewer/shipment-viewer.component').then(
            (m) => m.ShipmentViewerComponent,
          ),
      },
      {
        path: 'bols/:id',
        loadComponent: () =>
          import('./features/bols/detail/bol-detail.component').then((m) => m.BolDetailComponent),
      },
      {
        path: 'bol-builder',
        loadComponent: () =>
          import('./features/bol-builder/template-list/template-list.component').then(
            (m) => m.TemplateListComponent,
          ),
      },
      {
        path: 'bol-builder/new',
        loadComponent: () =>
          import('./features/bol-builder/wizard/template-wizard.component').then(
            (m) => m.TemplateWizardComponent,
          ),
      },
      {
        path: 'bol-builder/:id',
        loadComponent: () =>
          import('./features/bol-builder/wizard/template-wizard.component').then(
            (m) => m.TemplateWizardComponent,
          ),
      },
    ],
  },
  {
    path: 'ds-verify',
    loadComponent: () => import('./ds-verify/ds-verify.component').then((m) => m.DsVerifyComponent),
  },
  { path: '**', redirectTo: '' },
];
