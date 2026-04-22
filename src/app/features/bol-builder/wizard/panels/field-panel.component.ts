import { Component, inject, output } from '@angular/core';
import { TagModule } from 'primeng/tag';
import { WizardStateService } from '../../services/wizard-state.service';
import { MOCK_SHIPMENT } from '../../mock/mock-shipment';

type FieldType = 'string' | 'number' | 'date';

function inferType(key: string, value: unknown): FieldType {
  if (typeof value === 'number') return 'number';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return 'date';
  return 'string';
}

@Component({
  selector: 'ebol-field-panel',
  imports: [TagModule],
  styles: [`
    .panel { height: 100%; display: flex; flex-direction: column; }
    .panel-title {
      font-size: 10px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.08em; color: var(--p-text-muted-color);
      padding: 0.875rem 1rem 0.625rem; border-bottom: 1px solid var(--p-content-border-color);
      flex-shrink: 0;
    }
    .field-list { flex: 1; overflow-y: auto; padding: 0.5rem; }

    .field-item {
      display: flex; align-items: center; justify-content: space-between;
      padding: 0.5rem 0.625rem; border-radius: 6px; cursor: pointer;
      gap: 0.5rem; margin-bottom: 2px;
      transition: background 0.1s;
    }
    .field-item:hover  { background: var(--p-content-hover-background); }
    .field-item.active { background: #eff6ff; }
    .field-item.mapped { opacity: 0.5; }

    .field-key  { font-size: 11px; font-weight: 600; font-family: monospace; color: var(--p-text-color); }
    .mapped-dot { width: 6px; height: 6px; border-radius: 50%; background: #16a34a; flex-shrink: 0; }

    .empty { padding: 1rem; font-size: 12px; color: var(--p-text-muted-color); text-align: center; }
  `],
  template: `
    <div class="panel">
      <div class="panel-title">API Fields</div>
      <div class="field-list">
        @if (availableFields().length === 0) {
          <p class="empty">No fields selected in step 1.</p>
        }
        @for (f of availableFields(); track f.key) {
          <div
            class="field-item"
            [class.active]="activeKey() === f.key"
            (click)="select(f.key)"
          >
            <span class="field-key">{{ f.key }}</span>
            <div style="display:flex; align-items:center; gap: 0.35rem;">
              <p-tag
                [value]="f.type"
                [severity]="typeSeverity(f.type)"
                [style]="{ fontSize: '9px', padding: '1px 6px' }"
              />
              @if (isMapped(f.key)) {
                <span class="mapped-dot" title="Mapped to a slot"></span>
              }
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class FieldPanelComponent {
  fieldSelected = output<string>();

  wizard = inject(WizardStateService);

  // Active key in the left panel (drives "change mapping" flow)
  private _activeKey: string | null = null;

  activeKey(): string | null {
    return this._activeKey;
  }

  availableFields() {
    return Array.from(this.wizard.selectedApiKeys()).map((key) => ({
      key,
      type: inferType(key, (MOCK_SHIPMENT as Record<string, unknown>)[key]),
    }));
  }

  isMapped(apiKey: string): boolean {
    return this.wizard.template().mappings.some((m) => m.apiKey === apiKey);
  }

  select(key: string): void {
    this._activeKey = key;
    this.fieldSelected.emit(key);
  }

  typeSeverity(type: FieldType): 'info' | 'warn' | 'success' {
    return type === 'number' ? 'warn' : type === 'date' ? 'success' : 'info';
  }
}
