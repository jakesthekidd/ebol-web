import { Component, computed, inject } from '@angular/core';
import { WizardStateService } from '../../services/wizard-state.service';
import { FieldPanelComponent } from '../panels/field-panel.component';
import { DocumentCanvasComponent } from '../panels/document-canvas.component';
import { PropertiesPanelComponent } from '../panels/properties-panel.component';

@Component({
  selector: 'ebol-step-configure-doc',
  imports: [FieldPanelComponent, DocumentCanvasComponent, PropertiesPanelComponent],
  styles: [`
    :host { display: flex; flex-direction: column; flex: 1; min-height: 0; overflow: hidden; }

    .configure-wrap {
      display: grid;
      grid-template-columns: 220px 1fr 280px;
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }

    .panel-left {
      border-right: 1px solid var(--p-content-border-color);
      overflow: hidden; display: flex; flex-direction: column;
    }
    .panel-right {
      border-left: 1px solid var(--p-content-border-color);
      overflow: hidden; display: flex; flex-direction: column;
    }
    .panel-center {
      overflow: hidden; display: flex; flex-direction: column; min-width: 0;
    }

    .canvas-header {
      flex-shrink: 0;
      display: flex; align-items: center; justify-content: space-between;
      padding: 0.625rem 1rem;
      border-bottom: 1px solid var(--p-content-border-color);
      background: var(--p-content-background);
    }
    .canvas-label {
      font-size: 10px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.08em; color: var(--p-text-muted-color);
    }
    .canvas-hint {
      font-size: 11px; color: var(--p-text-muted-color);
      display: flex; align-items: center; gap: 0.35rem;
    }
    .canvas-hint i { font-size: 11px; }
  `],
  template: `
    <div class="configure-wrap">

      <!-- LEFT: API field list -->
      <div class="panel-left">
        <ebol-field-panel (fieldSelected)="onFieldSelected($event)" />
      </div>

      <!-- CENTER: BOL canvas -->
      <div class="panel-center">
        <div class="canvas-header">
          <span class="canvas-label">Bill of Lading — BOL</span>
          <span class="canvas-hint">
            <i class="pi pi-hand-pointer"></i>
            Click a slot to configure it
          </span>
        </div>
        <ebol-document-canvas style="flex: 1; min-height: 0; overflow: hidden;" />
      </div>

      <!-- RIGHT: Properties editor -->
      <div class="panel-right">
        <ebol-properties-panel [availableKeys]="availableKeys()" />
      </div>

    </div>
  `,
})
export class StepConfigureDocComponent {
  wizard = inject(WizardStateService);

  readonly availableKeys = computed(() => Array.from(this.wizard.selectedApiKeys()));

  onFieldSelected(key: string): void {
    const mappings = this.wizard.template().mappings;
    const alreadyMappedToKey = mappings.find((m) => m.apiKey === key);
    if (alreadyMappedToKey) {
      this.wizard.selectField(alreadyMappedToKey.fieldId);
    }
  }
}
