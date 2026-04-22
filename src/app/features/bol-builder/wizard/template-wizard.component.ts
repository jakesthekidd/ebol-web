import { Component, computed, inject, OnInit, input } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { StepsModule } from 'primeng/steps';
import type { MenuItem } from 'primeng/api';
import { WizardStateService } from '../services/wizard-state.service';
import { StepConnectApiComponent } from './steps/step-connect-api.component';
import { StepConfigureDocComponent } from './steps/step-configure-doc.component';
import { StepPublishComponent } from './steps/step-publish.component';
import { BOL_SLOTS } from '../types/bol-template.types';

@Component({
  selector: 'ebol-template-wizard',
  imports: [ButtonModule, StepsModule, StepConnectApiComponent, StepConfigureDocComponent, StepPublishComponent],
  styles: [`
    :host {
      display: flex; flex-direction: column; flex: 1; min-height: 0; overflow: hidden;
    }
    .wizard-wrap {
      display: flex; flex-direction: column; flex: 1; min-height: 0; overflow: hidden;
    }
    .wizard-header {
      flex-shrink: 0;
      padding: 1.25rem 2rem 0;
      border-bottom: 1px solid var(--p-content-border-color);
      background: var(--p-content-background);
    }
    .wizard-meta {
      display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem;
    }
    .back-link {
      background: none; border: none; cursor: pointer; padding: 0;
      color: var(--p-text-muted-color); font-size: 12px;
      display: flex; align-items: center; gap: 0.25rem;
    }
    .back-link:hover { color: var(--p-text-color); }
    .tpl-name-input {
      border: none; outline: none; background: transparent;
      font-size: 1rem; font-weight: 700; color: var(--p-text-color);
      font-family: inherit; padding: 0; min-width: 200px;
    }
    .tpl-name-input:focus {
      border-bottom: 2px solid var(--p-primary-color);
    }

    .wizard-body {
      flex: 1; min-height: 0; overflow: auto;
    }

    .wizard-footer {
      flex-shrink: 0;
      display: flex; justify-content: space-between; align-items: center;
      padding: 1rem 2rem;
      border-top: 1px solid var(--p-content-border-color);
      background: var(--p-content-background);
    }
    .footer-right { display: flex; gap: 0.5rem; }
  `],
  template: `
    <div class="wizard-wrap">

      <div class="wizard-header">
        <div class="wizard-meta">
          <button type="button" class="back-link" (click)="goToList()">
            <i class="pi pi-arrow-left"></i> Templates
          </button>
          <span style="color: var(--p-text-muted-color); font-size: 12px;">/</span>
          <input
            class="tpl-name-input"
            type="text"
            [value]="wizard.template().name"
            (blur)="onNameBlur($event)"
            (keydown.enter)="blurTarget($event)"
            aria-label="Template name"
          />
        </div>
        <p-steps [model]="stepItems" [activeIndex]="wizard.step() - 1" [readonly]="true" />
      </div>

      <div class="wizard-body">
        @switch (wizard.step()) {
          @case (1) { <ebol-step-connect-api /> }
          @case (2) { <ebol-step-configure-doc /> }
          @case (3) { <ebol-step-publish /> }
        }
      </div>

      <div class="wizard-footer">
        <p-button
          label="Back"
          severity="secondary"
          [outlined]="true"
          icon="pi pi-arrow-left"
          [disabled]="wizard.step() === 1"
          (click)="back()"
        />
        <div class="footer-right">
          <p-button
            label="Save draft"
            severity="secondary"
            [text]="true"
            (click)="saveDraft()"
          />
          @if (wizard.step() < 3) {
            <p-button
              label="Continue"
              icon="pi pi-arrow-right"
              iconPos="right"
              [disabled]="!canContinue()"
              (click)="next()"
            />
          }
        </div>
      </div>

    </div>
  `,
})
export class TemplateWizardComponent implements OnInit {
  id = input<string>();

  wizard = inject(WizardStateService);
  private router = inject(Router);

  readonly stepItems: MenuItem[] = [
    { label: 'Connect API' },
    { label: 'Configure Document' },
    { label: 'Publish' },
  ];

  readonly canContinue = computed(() => {
    const step = this.wizard.step();
    if (step === 1) return this.wizard.selectedApiKeys().size > 0;
    if (step === 2) return this.requiredSlotsMapped();
    return true;
  });

  private requiredSlotsMapped(): boolean {
    const mappings = this.wizard.template().mappings;
    const requiredSlots = BOL_SLOTS.filter((s) => s.defaultRequired);
    return requiredSlots.every((slot) => mappings.some((m) => m.fieldId === slot.fieldId));
  }

  ngOnInit(): void {
    const id = this.id();
    if (id) {
      this.wizard.loadTemplate(id);
    } else {
      this.wizard.newTemplate();
    }
  }

  next(): void {
    const cur = this.wizard.step();
    if (cur < 3) {
      this.wizard.saveAsDraft();
      this.wizard.setStep((cur + 1) as 1 | 2 | 3);
    }
  }

  back(): void {
    const cur = this.wizard.step();
    if (cur > 1) this.wizard.setStep((cur - 1) as 1 | 2 | 3);
  }

  saveDraft(): void {
    this.wizard.saveAsDraft();
    this.router.navigate(['/bol-builder']);
  }

  goToList(): void {
    this.router.navigate(['/bol-builder']);
  }

  onNameBlur(event: Event): void {
    const value = (event.target as HTMLInputElement).value.trim();
    if (value) this.wizard.updateTemplateName(value);
  }

  blurTarget(event: Event): void {
    (event.target as HTMLInputElement).blur();
  }
}
