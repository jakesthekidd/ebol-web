import { Component, computed, inject } from '@angular/core';
import { ToggleButtonModule } from 'primeng/togglebutton';
import { TagModule } from 'primeng/tag';
import { FormsModule } from '@angular/forms';
import { WizardStateService } from '../../services/wizard-state.service';
import { MOCK_SHIPMENT } from '../../mock/mock-shipment';

type FieldType = 'string' | 'number' | 'date';

interface MockField {
  key: string;
  value: string | number;
  type: FieldType;
}

function inferType(key: string, value: unknown): FieldType {
  if (typeof value === 'number') return 'number';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return 'date';
  return 'string';
}

function formatValue(value: unknown, type: FieldType): string {
  if (type === 'date') return new Date(value as string).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  if (type === 'number') return (value as number).toLocaleString();
  return String(value);
}

const MOCK_FIELDS: MockField[] = Object.entries(MOCK_SHIPMENT).map(([key, value]) => ({
  key,
  value: value as string | number,
  type: inferType(key, value),
}));

@Component({
  selector: 'ebol-step-connect-api',
  imports: [ToggleButtonModule, TagModule, FormsModule],
  styles: [`
    .step-wrap { padding: 2rem 2rem 4rem; max-width: 720px; }
    .step-title { font-size: 1rem; font-weight: 700; margin: 0 0 0.25rem; }
    .step-sub   { font-size: 13px; color: var(--p-text-muted-color); margin: 0 0 1.5rem; }

    .connected-badge {
      display: inline-flex; align-items: center; gap: 0.5rem;
      background: #f0fdf4; border: 1px solid #86efac;
      border-radius: 8px; padding: 0.5rem 1rem;
      font-size: 12px; font-weight: 600; color: #15803d;
      margin-bottom: 1.5rem;
    }
    .connected-dot {
      width: 7px; height: 7px; border-radius: 50%; background: #16a34a;
      animation: pulse 1.5s infinite;
    }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }

    .field-list { display: flex; flex-direction: column; gap: 0; border: 1px solid var(--p-content-border-color); border-radius: 10px; overflow: hidden; }
    .field-row {
      display: grid; grid-template-columns: 1fr auto auto 2fr;
      align-items: center; gap: 1rem; padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--p-content-border-color);
      background: var(--p-content-background);
      transition: background 0.1s;
    }
    .field-row:last-child { border-bottom: none; }
    .field-row.selected  { background: #eff6ff; }

    .field-key   { font-size: 12px; font-weight: 600; color: var(--p-text-color); font-family: monospace; }
    .field-value { font-size: 12px; color: var(--p-text-muted-color); text-align: right; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    .select-all-row {
      display: flex; justify-content: flex-end; margin-bottom: 0.75rem;
    }
    .select-all-btn {
      background: none; border: none; cursor: pointer; font-size: 12px;
      color: var(--p-primary-color); font-family: inherit; padding: 0;
    }
    .select-all-btn:hover { text-decoration: underline; }
  `],
  template: `
    <div class="step-wrap">
      <h2 class="step-title">Connect data source</h2>
      <p class="step-sub">Select the fields from your shipment data that you want available in the BOL document.</p>

      <div class="connected-badge">
        <span class="connected-dot"></span>
        Connected — mock data
      </div>

      <div class="select-all-row">
        <button type="button" class="select-all-btn" (click)="toggleAll()">
          {{ allSelected() ? 'Deselect all' : 'Select all' }}
        </button>
      </div>

      <div class="field-list">
        @for (field of fields; track field.key) {
          <div class="field-row" [class.selected]="wizard.selectedApiKeys().has(field.key)">
            <span class="field-key">{{ field.key }}</span>
            <p-tag
              [value]="field.type"
              [severity]="typeSeverity(field.type)"
              [style]="{ fontSize: '10px', padding: '2px 8px' }"
            />
            <p-togglebutton
              [ngModel]="wizard.selectedApiKeys().has(field.key)"
              (ngModelChange)="wizard.toggleApiKey(field.key)"
              onLabel="Included"
              offLabel="Include"
              onIcon="pi pi-check"
              offIcon="pi pi-plus"
              [style]="{ fontSize: '11px', padding: '4px 10px' }"
            />
            <span class="field-value">{{ formatValue(field.value, field.type) }}</span>
          </div>
        }
      </div>
    </div>
  `,
})
export class StepConnectApiComponent {
  wizard = inject(WizardStateService);
  readonly fields = MOCK_FIELDS;

  readonly allSelected = computed(
    () => this.fields.every((f) => this.wizard.selectedApiKeys().has(f.key)),
  );

  typeSeverity(type: FieldType): 'info' | 'warn' | 'success' {
    return type === 'number' ? 'warn' : type === 'date' ? 'success' : 'info';
  }

  formatValue(value: string | number, type: FieldType): string {
    return formatValue(value, type);
  }

  toggleAll(): void {
    if (this.allSelected()) {
      this.wizard.selectedApiKeys.set(new Set());
    } else {
      this.wizard.selectedApiKeys.set(new Set(this.fields.map((f) => f.key)));
    }
  }
}
