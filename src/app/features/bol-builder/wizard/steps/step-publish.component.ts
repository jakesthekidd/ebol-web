import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TooltipModule } from 'primeng/tooltip';
import { InputTextModule } from 'primeng/inputtext';
import { WizardStateService } from '../../services/wizard-state.service';
import { BOL_SLOTS } from '../../types/bol-template.types';
import { DocumentCanvasComponent } from '../panels/document-canvas.component';

interface CheckItem {
  label: string;
  status: 'pass' | 'fail' | 'warn';
  detail?: string;
}

@Component({
  selector: 'ebol-step-publish',
  imports: [FormsModule, ButtonModule, ToggleSwitchModule, TooltipModule, InputTextModule, DocumentCanvasComponent],
  styles: [`
    .publish-wrap {
      display: grid; grid-template-columns: 340px 1fr;
      height: 100%; min-height: 0; overflow: hidden;
    }

    .left-col {
      border-right: 1px solid var(--p-content-border-color);
      overflow-y: auto; padding: 1.75rem;
      display: flex; flex-direction: column; gap: 1.5rem;
    }

    .right-col {
      overflow: hidden; display: flex; flex-direction: column; min-height: 0;
    }
    .right-col-header {
      flex-shrink: 0; padding: 0.875rem 1rem;
      font-size: 10px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.08em; color: var(--p-text-muted-color);
      border-bottom: 1px solid var(--p-content-border-color);
    }

    .section-title { font-size: 12px; font-weight: 700; color: var(--p-text-color); margin: 0 0 0.75rem; }

    /* Checklist */
    .check-list { display: flex; flex-direction: column; gap: 0.5rem; }
    .check-item { display: flex; align-items: flex-start; gap: 0.625rem; }
    .check-icon { font-size: 14px; flex-shrink: 0; margin-top: 1px; }
    .check-icon.pass { color: #16a34a; }
    .check-icon.fail { color: #dc2626; }
    .check-icon.warn { color: #d97706; }
    .check-label { font-size: 12px; color: var(--p-text-color); }
    .check-detail { font-size: 11px; color: var(--p-text-muted-color); margin-top: 1px; }

    /* Settings */
    .settings-list { display: flex; flex-direction: column; gap: 1rem; }
    .setting-row { display: flex; flex-direction: column; gap: 0.35rem; }
    .setting-label {
      font-size: 11px; font-weight: 600; color: var(--p-text-muted-color);
      text-transform: uppercase; letter-spacing: 0.06em;
    }
    .setting-toggle-row { display: flex; align-items: center; justify-content: space-between; }
    .setting-disabled-note { font-size: 11px; color: var(--p-text-muted-color); }

    /* Publish action */
    .publish-section { border-top: 1px solid var(--p-content-border-color); padding-top: 1.25rem; }
    .signer-note { font-size: 11px; color: var(--p-text-muted-color); margin-top: 0.75rem; }
    .signer-note i { margin-right: 4px; }

    /* Success */
    .success-state {
      text-align: center; padding: 2rem 1rem;
      background: #f0fdf4; border: 1px solid #86efac; border-radius: 10px;
    }
    .success-state i { font-size: 2.5rem; color: #16a34a; display: block; margin-bottom: 0.75rem; }
    .success-state h3 { font-size: 1rem; font-weight: 700; margin: 0 0 0.5rem; color: #15803d; }
    .success-state p  { font-size: 13px; color: #166534; margin: 0 0 1rem; }
  `],
  template: `
    <div class="publish-wrap">

      <!-- LEFT: checklist + settings -->
      <div class="left-col">

        @if (published()) {
          <div class="success-state">
            <i class="pi pi-check-circle"></i>
            <h3>Template published!</h3>
            <p>{{ wizard.template().name }} is now live.</p>
            <p-button label="Back to templates" icon="pi pi-arrow-left" severity="secondary" [outlined]="true" (click)="goToList()" />
          </div>
        } @else {

          <!-- Checklist -->
          <div>
            <p class="section-title">Readiness checklist</p>
            <div class="check-list">
              @for (item of checklist(); track item.label) {
                <div class="check-item">
                  <i
                    class="check-icon pi"
                    [class.pass]="item.status === 'pass'"
                    [class.fail]="item.status === 'fail'"
                    [class.warn]="item.status === 'warn'"
                    [class.pi-check-circle]="item.status === 'pass'"
                    [class.pi-times-circle]="item.status === 'fail'"
                    [class.pi-exclamation-triangle]="item.status === 'warn'"
                  ></i>
                  <div>
                    <div class="check-label">{{ item.label }}</div>
                    @if (item.detail) {
                      <div class="check-detail">{{ item.detail }}</div>
                    }
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Settings -->
          <div>
            <p class="section-title">Publish settings</p>
            <div class="settings-list">
              <div class="setting-row">
                <label class="setting-label">Document name format</label>
                <input
                  pInputText
                  type="text"
                  [(ngModel)]="nameFormat"
                  placeholder="BOL-{{ '{' + '{shipment_id}' + '}' }}"
                  size="small"
                />
              </div>
              <div class="setting-row">
                <div class="setting-toggle-row">
                  <span class="setting-label">Auto-send to driver</span>
                  <p-toggleswitch
                    [ngModel]="false"
                    [disabled]="true"
                    pTooltip="Available after signers configured"
                    tooltipPosition="left"
                  />
                </div>
                <span class="setting-disabled-note">Available after signers configured</span>
              </div>
            </div>
          </div>

          <!-- Publish action -->
          <div class="publish-section">
            <p-button
              label="Publish template"
              icon="pi pi-send"
              [disabled]="hasErrors()"
              (click)="publish()"
              [style]="{ width: '100%' }"
            />
            <p class="signer-note">
              <i class="pi pi-info-circle"></i>
              Signer configuration coming soon
            </p>
          </div>

        }
      </div>

      <!-- RIGHT: read-only BOL preview -->
      <div class="right-col">
        <div class="right-col-header">Document preview</div>
        <ebol-document-canvas [readonly]="true" style="flex: 1; min-height: 0; overflow: hidden;" />
      </div>

    </div>
  `,
})
export class StepPublishComponent {
  wizard = inject(WizardStateService);
  published = signal(false);
  nameFormat = 'BOL-{{shipment_id}}';

  readonly checklist = computed<CheckItem[]>(() => {
    const mappings = this.wizard.template().mappings;
    const items: CheckItem[] = [];

    // Always passes
    items.push({ label: 'Mock data connected', status: 'pass', detail: 'Using MOCK_SHIPMENT local data' });

    // Required slots mapped
    const requiredSlots = BOL_SLOTS.filter((s) => s.defaultRequired);
    const unmappedRequired = requiredSlots.filter((s) => !mappings.some((m) => m.fieldId === s.fieldId));
    if (unmappedRequired.length === 0) {
      items.push({ label: 'All required fields mapped', status: 'pass' });
    } else {
      items.push({
        label: 'All required fields mapped',
        status: 'fail',
        detail: `Missing: ${unmappedRequired.map((s) => s.fieldId).join(', ')}`,
      });
    }

    // Optional slots unmapped
    const optionalSlots = BOL_SLOTS.filter((s) => !s.defaultRequired);
    const unmappedOptional = optionalSlots.filter((s) => !mappings.some((m) => m.fieldId === s.fieldId));
    if (unmappedOptional.length > 0) {
      items.push({
        label: `${unmappedOptional.length} optional field(s) unmapped`,
        status: 'warn',
        detail: unmappedOptional.map((s) => s.fieldId).join(', '),
      });
    }

    // Mappings with no fallback
    const noFallback = mappings.filter((m) => !m.fallback && !m.required);
    if (noFallback.length > 0) {
      items.push({
        label: `${noFallback.length} optional field(s) have no fallback`,
        status: 'warn',
        detail: 'Will show blank if field is empty',
      });
    }

    return items;
  });

  readonly hasErrors = computed(() => this.checklist().some((c) => c.status === 'fail'));

  publish(): void {
    this.wizard.publishTemplate();
    this.published.set(true);
  }

  goToList(): void {
    // Handled by wizard footer "Save draft" or parent nav
    window.history.back();
  }
}
