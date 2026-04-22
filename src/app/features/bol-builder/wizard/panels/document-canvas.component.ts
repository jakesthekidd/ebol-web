import { Component, ElementRef, inject, input, ViewChild } from '@angular/core';
import { WizardStateService } from '../../services/wizard-state.service';
import { BOL_SLOTS } from '../../types/bol-template.types';
import type { BolSlotDef, FieldMapping } from '../../types/bol-template.types';

@Component({
  selector: 'ebol-document-canvas',
  imports: [],
  styles: [`
    /* ── Scroll wrapper ── */
    .canvas-wrap {
      height: 100%; overflow-y: auto;
      display: flex; justify-content: center;
      padding: 1.5rem 1rem; background: #cbd5e1;
    }

    /* ── Paper — letter size 8.5 × 11 ── */
    .paper {
      width: 100%;
      max-width: 660px;
      aspect-ratio: 8.5 / 11;
      flex-shrink: 0;
      background: #fff;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15), 0 8px 32px rgba(0,0,0,0.10);
      border: 1px solid #c0c8d2;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 10px;
      color: #1a1a1a;
      display: flex;
      flex-direction: column;
    }

    /* ─────────────────── HEADER ─────────────────── */
    .doc-header {
      flex-shrink: 0;
      display: grid;
      grid-template-columns: 130px 1fr 170px;
      border-bottom: 3px double #374151;
      padding: 10px 12px;
      gap: 8px;
      align-items: center;
      min-height: 88px;
    }

    /* Logo */
    .logo-zone {
      width: 118px; height: 64px;
      border: 1.5px dashed #9ca3af;
      border-radius: 3px;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      gap: 3px; color: #9ca3af;
      cursor: pointer; overflow: hidden;
      transition: border-color .15s, background .15s;
      flex-shrink: 0;
    }
    .logo-zone:hover              { border-color: #3b82f6; background: #eff6ff; color: #3b82f6; }
    .logo-zone.readonly           { cursor: default; border-style: solid; }
    .logo-zone.readonly:hover     { background: transparent; color: #9ca3af; border-color: #9ca3af; }
    .logo-zone i                  { font-size: 15px; }
    .logo-zone .upload-label      { font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; }
    .logo-img                     { width: 100%; height: 100%; object-fit: contain; padding: 4px; }

    /* Title */
    .doc-title-block { text-align: center; }
    .doc-title {
      font-size: 17px; font-weight: 900; text-transform: uppercase;
      letter-spacing: .12em; color: #111827; margin: 0 0 3px;
    }
    .doc-sub { font-size: 7.5px; letter-spacing: .06em; text-transform: uppercase; color: #6b7280; margin: 0; }

    /* Header meta (BOL# + date) */
    .doc-meta { display: flex; flex-direction: column; gap: 4px; }
    .meta-cell {
      border: 1px solid #9ca3af;
      padding: 3px 6px;
      cursor: pointer;
      min-height: 28px;
      transition: border-color .1s, background .1s;
    }
    .meta-cell:hover               { border-color: #60a5fa; background: #f0f9ff; }
    .meta-cell.sel                 { border-color: #2563eb; background: #dbeafe; outline: 2px solid #93c5fd; outline-offset: -1px; }
    .meta-cell.readonly            { cursor: default; }
    .meta-cell.readonly:hover      { border-color: #9ca3af; background: transparent; }

    /* ─────────────────── SECTION HEAD ─────────────────── */
    .section-head {
      background: #e5e7eb;
      border-top: 1px solid #9ca3af;
      border-bottom: 1px solid #9ca3af;
      padding: 3px 8px;
      font-size: 7.5px; font-weight: 800; text-transform: uppercase;
      letter-spacing: .1em; color: #374151;
      flex-shrink: 0;
    }

    /* ─────────────────── FORM CELL ─────────────────── */
    .form-cell {
      flex: 1;
      border: 1px solid #d1d5db;
      border-top: none;
      padding: 5px 8px 6px;
      cursor: pointer;
      transition: border-color .1s, background .1s;
      display: flex; flex-direction: column;
    }
    .form-cell:hover               { border-color: #60a5fa; background: #f0f9ff; }
    .form-cell.sel                 { border-color: #2563eb !important; background: #dbeafe !important; outline: 2px solid #93c5fd; outline-offset: -1px; }
    .form-cell.readonly            { cursor: default; }
    .form-cell.readonly:hover      { border-color: #d1d5db; background: transparent; }

    .cell-label {
      font-size: 6.5px; font-weight: 700; text-transform: uppercase;
      letter-spacing: .1em; color: #9ca3af; margin-bottom: 5px; flex-shrink: 0;
    }
    .cell-value { flex: 1; }

    .token {
      display: inline-block;
      background: #eff6ff; color: #1e40af;
      border: 1px solid #bfdbfe;
      border-radius: 2px; padding: 1px 4px;
      font-size: 9px; font-family: monospace; font-weight: 600;
    }
    .driver-token {
      display: inline-flex; align-items: center; gap: 2px;
      background: #fefce8; color: #92400e;
      border: 1px solid #fde68a;
      border-radius: 2px; padding: 1px 4px;
      font-size: 9px; font-weight: 600;
    }
    .driver-token i { font-size: 8px; }
    .unmapped {
      display: block;
      border-bottom: 1px dashed #e5e7eb;
      color: #e5e7eb; font-size: 8px; padding-bottom: 2px;
    }

    /* ─────────────────── PARTIES ─────────────────── */
    .parties {
      flex: 1;
      display: grid;
      grid-template-columns: 1fr 1fr;
      min-height: 0;
    }
    .party-col {
      display: flex; flex-direction: column;
      border-right: 1px solid #9ca3af;
      min-height: 0;
    }
    .party-col:last-child { border-right: none; }
    .party-col .form-cell { border-left: none; border-right: none; }
    .party-col .form-cell + .form-cell { border-top: 1px solid #e5e7eb; }

    /* ─────────────────── COMMODITY ─────────────────── */
    .commodity-section {
      flex-shrink: 0;
      border-top: 1px solid #9ca3af;
      display: flex; flex-direction: column;
    }
    .commodity-row {
      display: grid; grid-template-columns: 1fr 90px 90px;
    }
    .commodity-row .form-cell { border-top: none; }
    .commodity-row .form-cell + .form-cell {
      border-left: 1px solid #d1d5db;
    }
    .commodity-row .form-cell:first-child { border-left: none; }
    .commodity-row .form-cell:last-child  { border-right: none; }

    /* ─────────────────── SIGNATURE ROW ─────────────────── */
    .sig-row {
      flex-shrink: 0;
      display: grid; grid-template-columns: 1fr 1fr;
      border-top: 1px solid #9ca3af;
    }
    .sig-col {
      padding: 8px 12px 10px;
      display: flex; flex-direction: column; gap: 4px;
    }
    .sig-col + .sig-col { border-left: 1px solid #9ca3af; }
    .sig-col-label {
      font-size: 6.5px; font-weight: 800; text-transform: uppercase;
      letter-spacing: .1em; color: #374151;
    }
    .sig-line {
      border-bottom: 1px solid #374151; height: 20px;
      margin-top: 2px;
    }
    .sig-date { font-size: 7px; color: #9ca3af; }

    /* ─────────────────── FOOTER ─────────────────── */
    .doc-footer {
      flex-shrink: 0;
      border-top: 1px solid #9ca3af;
      padding: 5px 12px;
      font-size: 6.5px; color: #9ca3af; line-height: 1.5;
      text-align: center;
    }
  `],
  template: `
    <input #logoInput type="file" accept="image/*" style="display:none" (change)="onLogoFile($event)" />

    <div class="canvas-wrap">
      <div class="paper">

        <!-- ── Header ── -->
        <div class="doc-header">

          <!-- Logo -->
          @if (wizard.template().logoDataUrl) {
            <div class="logo-zone" [class.readonly]="readonly()" (click)="!readonly() && logoInput.click()">
              <img class="logo-img" [src]="wizard.template().logoDataUrl" alt="Logo" />
            </div>
          } @else {
            <div class="logo-zone" [class.readonly]="readonly()" (click)="!readonly() && logoInput.click()">
              <i class="pi pi-image"></i>
              <span class="upload-label">Upload logo</span>
            </div>
          }

          <!-- Title -->
          <div class="doc-title-block">
            <p class="doc-title">Bill of Lading</p>
            <p class="doc-sub">Straight Bill of Lading &mdash; Original &mdash; Not Negotiable</p>
          </div>

          <!-- BOL # + Date -->
          <div class="doc-meta">
            @for (slot of headerSlots; track slot.fieldId) {
              <div
                class="meta-cell"
                [class.sel]="!readonly() && isSelected(slot)"
                [class.readonly]="readonly()"
                (click)="selectSlot(slot)"
              >
                <div class="cell-label">{{ getLabel(slot) }}</div>
                <div class="cell-value">
                  @if (getMapping(slot.fieldId); as m) {
                    @if (m.driverInput) {
                      <span class="driver-token"><i class="pi pi-pencil"></i>Driver fills in</span>
                    } @else {
                      <span class="token">{{ token(m.apiKey!) }}</span>
                    }
                  } @else {
                    <span class="unmapped">— unmapped —</span>
                  }
                </div>
              </div>
            }
          </div>
        </div>

        <!-- ── Shipper / Consignee (stretches to fill) ── -->
        <div class="parties">
          <div class="party-col">
            <div class="section-head">Shipper / From</div>
            @for (slot of shipperSlots; track slot.fieldId) {
              <div
                class="form-cell"
                [class.sel]="!readonly() && isSelected(slot)"
                [class.readonly]="readonly()"
                (click)="selectSlot(slot)"
              >
                <div class="cell-label">{{ getLabel(slot) }}</div>
                <div class="cell-value">
                  @if (getMapping(slot.fieldId); as m) {
                    @if (m.driverInput) {
                      <span class="driver-token"><i class="pi pi-pencil"></i>Driver fills in</span>
                    } @else {
                      <span class="token">{{ token(m.apiKey!) }}</span>
                    }
                  } @else {
                    <span class="unmapped">— unmapped —</span>
                  }
                </div>
              </div>
            }
          </div>
          <div class="party-col">
            <div class="section-head">Consignee / To</div>
            @for (slot of consigneeSlots; track slot.fieldId) {
              <div
                class="form-cell"
                [class.sel]="!readonly() && isSelected(slot)"
                [class.readonly]="readonly()"
                (click)="selectSlot(slot)"
              >
                <div class="cell-label">{{ getLabel(slot) }}</div>
                <div class="cell-value">
                  @if (getMapping(slot.fieldId); as m) {
                    @if (m.driverInput) {
                      <span class="driver-token"><i class="pi pi-pencil"></i>Driver fills in</span>
                    } @else {
                      <span class="token">{{ token(m.apiKey!) }}</span>
                    }
                  } @else {
                    <span class="unmapped">— unmapped —</span>
                  }
                </div>
              </div>
            }
          </div>
        </div>

        <!-- ── Commodity ── -->
        <div class="commodity-section">
          <div class="section-head">Commodity Description</div>
          <div class="commodity-row">
            @for (slot of commoditySlots; track slot.fieldId) {
              <div
                class="form-cell"
                [class.sel]="!readonly() && isSelected(slot)"
                [class.readonly]="readonly()"
                (click)="selectSlot(slot)"
              >
                <div class="cell-label">{{ getLabel(slot) }}</div>
                <div class="cell-value">
                  @if (getMapping(slot.fieldId); as m) {
                    @if (m.driverInput) {
                      <span class="driver-token"><i class="pi pi-pencil"></i>Driver fills in</span>
                    } @else {
                      <span class="token">{{ token(m.apiKey!) }}</span>
                    }
                  } @else {
                    <span class="unmapped">— unmapped —</span>
                  }
                </div>
              </div>
            }
          </div>
        </div>

        <!-- ── Signature block ── -->
        <div class="sig-row">
          <div class="sig-col">
            <div class="sig-col-label">Shipper Signature &amp; Date</div>
            <div class="sig-line"></div>
            <div class="sig-date">The above named materials are properly classified, described, packaged, marked and labeled.</div>
          </div>
          <div class="sig-col">
            <div class="sig-col-label">Carrier Signature &amp; Date</div>
            <div class="sig-line"></div>
            <div class="sig-date">Carrier acknowledges receipt of packages and required placards.</div>
          </div>
        </div>

        <!-- ── Footer ── -->
        <div class="doc-footer">
          This is to certify that the above named materials are properly classified, described, packaged, marked, and labeled,
          and are in proper condition for transportation according to applicable regulations of the DOT.
        </div>

      </div>
    </div>
  `,
})
export class DocumentCanvasComponent {
  readonly = input(false);

  wizard = inject(WizardStateService);

  @ViewChild('logoInput') logoInput!: ElementRef<HTMLInputElement>;

  readonly headerSlots    = BOL_SLOTS.filter((s) => s.section === 'header');
  readonly shipperSlots   = BOL_SLOTS.filter((s) => s.section === 'shipper');
  readonly consigneeSlots = BOL_SLOTS.filter((s) => s.section === 'consignee');
  readonly commoditySlots = BOL_SLOTS.filter((s) => s.section === 'commodity');

  getMapping(fieldId: string): FieldMapping | undefined {
    return this.wizard.template().mappings.find((m) => m.fieldId === fieldId);
  }

  getLabel(slot: BolSlotDef): string {
    return this.getMapping(slot.fieldId)?.label ?? slot.defaultLabel;
  }

  isSelected(slot: BolSlotDef): boolean {
    return this.wizard.selectedFieldId() === slot.fieldId;
  }

  token(apiKey: string): string {
    return `{{${apiKey}}}`;
  }

  selectSlot(slot: BolSlotDef): void {
    if (this.readonly()) return;
    this.wizard.selectField(this.isSelected(slot) ? null : slot.fieldId);
  }

  onLogoFile(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => this.wizard.setLogo(e.target?.result as string);
    reader.readAsDataURL(file);
    (event.target as HTMLInputElement).value = '';
  }
}
