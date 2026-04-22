import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';

/**
 * Temporary route to verify PrimeNG + TransfloTheme match the design-system
 * catalog (see reference src/stories/button/button.stories.ts — Primary).
 */
@Component({
  selector: 'ebol-ds-verify',
  imports: [ButtonModule, RouterLink],
  template: `
    <main style="padding: 1.5rem;">
      <p style="margin: 0 0 1rem;">
        <a routerLink="/">← Home</a>
      </p>
      <p style="margin: 0 0 1rem; color: var(--p-text-muted-color); font-size: 13px;">
        Same import and template as design-system
        <code>button.stories.ts</code> Primary story.
      </p>
      <p-button label="Primary Button" />
    </main>
  `,
})
export class DsVerifyComponent {}
