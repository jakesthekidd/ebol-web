import { APP_INITIALIZER, ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { providePrimeNG } from 'primeng/config';
import { ConfirmationService, MessageService } from 'primeng/api';

import { routes } from './app.routes';
import TransfloTheme from '../theme/transflo-theme';
import { AuthService } from './features/auth/auth.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(),
    provideRouter(routes, withComponentInputBinding()),
    provideAnimationsAsync(),
    providePrimeNG({
      theme: {
        preset: TransfloTheme,
        options: {
          darkModeSelector: '.p-dark',
          cssLayer: false,
        },
      },
    }),
    // Global PrimeNG services available to all components via injection
    MessageService,
    ConfirmationService,
    // Initialize auth session before routes resolve
    {
      provide: APP_INITIALIZER,
      useFactory: (auth: AuthService) => () => auth.initialize(),
      deps: [AuthService],
      multi: true,
    },
  ],
};
