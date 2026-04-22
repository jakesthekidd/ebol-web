import { Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { WizardStateService } from '../../services/wizard-state.service';
import { BOL_SLOTS } from '../../types/bol-template.types';
import type { FieldMapping } from '../../types/bol-template.types';
import type { MockShipmentKey } from '../../mock/mock-shipment';

const FORMAT_OPTIONS = [
  { label: 'Text',     value: 'text'     },
  { label: 'Date',     value: 'date'     },
  { label: 'Currency', value: 'currency' },
  { label: 'Number',   value: 'number'   },
];

@Component({
  selector: 'ebol-properties-panel',
  imports: [FormsModule, SelectModule, ToggleSwitchModule, ButtonModule, InputTextModule],
  styles: [`
    .panel { height: 100%; display: flex; flex-direction: column; overflow: hidden; }

    .panel-title {
      font-size: 10px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.08em; color: var(--p-text-muted-color);
      padding: 0.875rem 1rem 0.625rem;
      border-bottom: 1px solid var(--p-content-border-color);
      flex-shrink: 0;
    }

    /* Empty / no selection */
    .empty-state {
      flex: 1; display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      color: var(--p-text-muted-color); text-align: center; padding: 2rem 1.5rem;
      gap: 0.75rem;
    }
    .empty-icon {
      width: 48px; height: 48px; border-radius: 12px;
      background: var(--p-content-hover-background);
      display: flex; align-items: center; justify-content: center;
    }
    .empty-icon i { font-size: 20px; opacity: 0.5; }
    .empty-title { font-size: 13px; font-weight: 600; color: var(--p-text-color); margin: 0; }
    .empty-sub   { font-size: 12px; margin: 0; line-height: 1.5; }

    /* Props form */
    .props { flex: 1; overflow-y: auto; padding: 1rem; display: flex; flex-direction: column; gap: 1.25rem; }

    .slot-header {
      display: flex; align-items: center; justify-content: space-between;
      padding-bottom: 0.75rem; border-bottom: 1px solid var(--p-content-border-color);
    }
    .slot-badge {
      font-size: 11px; font-weight: 700; font-family: monospace;
      background: #eff6ff; color: #1d4ed8;
      border-radius: 4px; padding: 3px 8px;
    }
    .slot-section {
      font-size: 10px; color: var(--p-text-muted-color);
      text-transform: uppercase; letter-spacing: 0.06em;
    }

    .field-row { display: flex; flex-direction: column; gap: 0.4rem; }
    .field-label {
      font-size: 11px; font-weight: 600; color: var(--p-text-muted-color);
      text-transform: uppercase; letter-spacing: 0.06em;
    }

    /* API key picker */
    .api-picker-label {
      font-size: 11px; font-weight: 600; color: var(--p-text-muted-color);
      text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 0.35rem;
      display: flex; align-items: center; gap: 0.35rem;
    }
    .api-picker-label .required-star { color: #dc2626; }

    .api-key-list {
      border: 1px solid var(--p-content-border-color); border-radius: 8px; overflow: hidden;
    }
    .api-key-item {
      display: flex; align-items: center; justify-content: space-between;
      padding: 0.5rem 0.75rem; font-size: 11px; cursor: pointer;
      border-bottom: 1px solid var(--p-content-border-color);
      background: var(--p-content-background);
      font-family: monospace;
      transition: background 0.1s;
    }
    .api-key-item:last-child { border-bottom: none; }
    .api-key-item:hover { background: var(--p-content-hover-background); }
    .api-key-item.active { background: #dbeafe; color: #1d4ed8; font-weight: 700; }
    .api-key-item .check { color: #1d4ed8; font-size: 11px; }

    /* Driver input item — styled distinctly */
    .driver-item {
      font-family: inherit; font-weight: 600;
      color: var(--p-text-color);
      background: #fefce8;
      border-bottom-color: var(--p-content-border-color) !important;
    }
    .driver-item:hover { background: #fef9c3; }
    .driver-item.active { background: #fef9c3; color: #92400e; }
    .driver-item i { color: #d97706; margin-right: 4px; }

    /* Mapped summary */
    .mapped-summary {
      display: flex; align-items: center; justify-content: space-between;
      background: #f0fdf4; border: 1px solid #86efac;
      border-radius: 6px; padding: 0.5rem 0.75rem;
    }
    .mapped-summary.driver-mapped {
      background: #fefce8; border-color: #fde68a;
    }
    .mapped-key { font-size: 12px; font-family: monospace; font-weight: 600; color: #15803d; }
    .mapped-key.driver-key { font-family: inherit; color: #92400e; }
    .mapped-key.driver-key i { margin-right: 4px; color: #d97706; }

    .toggle-row {
      display: flex; align-items: center; justify-content: space-between;
    }

    .divider { border: none; border-top: 1px solid var(--p-content-border-color); margin: 0; }
  `],
  template: `
    <div class="panel">
      <div class="panel-title">Properties</div>

      @if (!selectedSlot()) {
        <div class="empty-state">
          <div class="empty-icon"><i class="pi pi-hand-pointer"></i></div>
          <p class="empty-title">Select a field slot</p>
          <p class="empty-sub">Click any slot on the BOL canvas to assign an API field or mark it as driver input.</p>
        </div>

      } @else {
        <div class="props">

          <!-- Slot identity -->
          <div class="slot-header">
            <span class="slot-badge">{{ selectedSlot()!.fieldId }}</span>
            <span class="slot-section">{{ selectedSlot()!.section }}</span>
          </div>

          <!-- Value source -->
          <div class="field-row">
            <div class="api-picker-label">
              Value source
              @if (selectedSlot()!.defaultRequired) {
                <span class="required-star">*</span>
              }
            </div>

            @if (currentMapping()) {
              <!-- Already mapped — show summary + change option -->
              @if (currentMapping()!.driverInput) {
                <div class="mapped-summary driver-mapped">
                  <span class="mapped-key driver-key"><i class="pi pi-pencil"></i>Driver fills in</span>
                  <p-button label="Change" [text]="true" size="small" (click)="showPicker.set(!showPicker())" />
                </div>
              } @else {
                <div class="mapped-summary">
                  <span class="mapped-key">{{ currentMapping()!.apiKey }}</span>
                  <p-button label="Change" [text]="true" size="small" (click)="showPicker.set(!showPicker())" />
                </div>
              }

              @if (showPicker()) {
                <div class="api-key-list" style="margin-top: 0.35rem;">
                  <div
                    class="api-key-item driver-item"
                    [class.active]="currentMapping()!.driverInput"
                    (click)="assignDriverInput()"
                  >
                    <span><i class="pi pi-pencil"></i>Driver fills in</span>
                    @if (currentMapping()!.driverInput) { <i class="pi pi-check check"></i> }
                  </div>
                  @for (key of availableKeys(); track key) {
                    <div
                      class="api-key-item"
                      [class.active]="currentMapping()!.apiKey === key"
                      (click)="assignKey(key)"
                    >
                      {{ key }}
                      @if (currentMapping()!.apiKey === key) { <i class="pi pi-check check"></i> }
                    </div>
                  }
                </div>
              }

            } @else {
              <!-- Not yet mapped — show picker directly -->
              @if (availableKeys().length === 0) {
                <p style="font-size: 12px; color: var(--p-text-muted-color); margin: 0;">
                  No API fields selected. Go back to Step 1 and select fields.
                </p>
              } @else {
                <div class="api-key-list">
                  <div class="api-key-item driver-item" (click)="assignDriverInput()">
                    <span><i class="pi pi-pencil"></i>Driver fills in</span>
                  </div>
                  @for (key of availableKeys(); track key) {
                    <div class="api-key-item" (click)="assignKey(key)">{{ key }}</div>
                  }
                </div>
              }
            }
          </div>

          @if (currentMapping()) {
            <hr class="divider" />

            <!-- Label -->
            <div class="field-row">
              <label class="field-label">Label</label>
              <input
                pInputText
                type="text"
                [ngModel]="currentMapping()!.label"
                (ngModelChange)="patch({ label: $event })"
              />
            </div>

            <!-- Required -->
            <div class="field-row">
              <div class="toggle-row">
                <span class="field-label">Required</span>
                <p-toggleswitch
                  [ngModel]="currentMapping()!.required"
                  (ngModelChange)="patch({ required: $event })"
                />
              </div>
            </div>

            @if (!currentMapping()!.driverInput) {
              <!-- Format (API fields only) -->
              <div class="field-row">
                <label class="field-label">Format</label>
                <p-select
                  [ngModel]="currentMapping()!.format"
                  (ngModelChange)="patch({ format: $event })"
                  [options]="formatOptions"
                  optionLabel="label" optionValue="value"
                />
              </div>

              <!-- Fallback (API fields only) -->
              <div class="field-row">
                <label class="field-label">Fallback value</label>
                <input
                  pInputText
                  type="text"
                  [ngModel]="currentMapping()!.fallback"
                  (ngModelChange)="patch({ fallback: $event })"
                  placeholder="Shown when field is empty"
                />
              </div>
            }

            <!-- Remove -->
            <p-button
              label="Remove"
              severity="danger"
              [text]="true"
              icon="pi pi-trash"
              size="small"
              (click)="removeMapping()"
            />
          }

        </div>
      }
    </div>
  `,
})
export class PropertiesPanelComponent {
  availableKeys = input<string[]>([]);

  wizard = inject(WizardStateService);
  showPicker = signal(false);
  readonly formatOptions = FORMAT_OPTIONS;

  readonly selectedSlot = computed(() => {
    const id = this.wizard.selectedFieldId();
    return id ? (BOL_SLOTS.find((s) => s.fieldId === id) ?? null) : null;
  });

  readonly currentMapping = computed<FieldMapping | undefined>(() => {
    const slot = this.selectedSlot();
    if (!slot) return undefined;
    return this.wizard.template().mappings.find((m) => m.fieldId === slot.fieldId);
  });

  assignKey(key: string): void {
    const slot = this.selectedSlot();
    if (!slot) return;
    const existing = this.currentMapping();
    const updated: FieldMapping = {
      fieldId: slot.fieldId,
      label: existing?.label ?? slot.defaultLabel,
      apiKey: key as MockShipmentKey,
      driverInput: false,
      format: existing?.format ?? 'text',
      required: existing?.required ?? slot.defaultRequired,
      fallback: existing?.fallback ?? '',
    };
    this.wizard.updateMapping(updated);
    this.showPicker.set(false);
  }

  assignDriverInput(): void {
    const slot = this.selectedSlot();
    if (!slot) return;
    const existing = this.currentMapping();
    const updated: FieldMapping = {
      fieldId: slot.fieldId,
      label: existing?.label ?? slot.defaultLabel,
      driverInput: true,
      apiKey: undefined,
      format: 'text',
      required: existing?.required ?? slot.defaultRequired,
      fallback: '',
    };
    this.wizard.updateMapping(updated);
    this.showPicker.set(false);
  }

  patch(partial: Partial<FieldMapping>): void {
    const slot = this.selectedSlot();
    const existing = this.currentMapping();
    if (!slot || !existing) return;
    this.wizard.updateMapping({ ...existing, ...partial });
  }

  removeMapping(): void {
    const slot = this.selectedSlot();
    if (slot) {
      this.wizard.removeMapping(slot.fieldId);
      this.showPicker.set(false);
    }
  }
}
