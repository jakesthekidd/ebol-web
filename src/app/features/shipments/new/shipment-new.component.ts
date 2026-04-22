import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { BolsService } from '../../bols/bols.service';

interface FileEntry {
  file: File;
  bolNumber: string;
}

@Component({
  selector: 'ebol-shipment-new',
  imports: [FormsModule, ButtonModule, InputTextModule],
  styles: [`
    :host { display: flex; flex: 1; min-height: 0; overflow: hidden; background: #f8fafc; }

    .layout {
      flex: 1; display: flex; flex-direction: column; overflow-y: auto;
      align-items: center; padding: 2rem 1rem;
    }

    .back-btn {
      align-self: flex-start; display: flex; align-items: center; gap: 0.4rem;
      font-size: 12px; font-weight: 600; color: #004b87; background: none; border: none;
      cursor: pointer; padding: 0.4rem 0; margin-bottom: 1.25rem; font-family: inherit;
    }
    .back-btn:hover { text-decoration: underline; }

    .card {
      width: 100%; max-width: 560px;
      background: #fff; border: 1px solid #e2e8f0; border-radius: 14px;
      overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.06);
    }

    .card-header {
      padding: 1.25rem 1.5rem 1rem;
      border-bottom: 1px solid #f1f5f9;
    }
    .card-title { font-size: 16px; font-weight: 700; color: #0f172a; margin: 0 0 3px; }
    .card-sub   { font-size: 12px; color: #64748b; margin: 0; }

    .card-body { padding: 1.25rem 1.5rem; display: flex; flex-direction: column; gap: 1rem; }

    .field { display: flex; flex-direction: column; gap: 0.35rem; }
    .field label {
      font-size: 12px; font-weight: 600; color: #475569;
      display: flex; align-items: center; gap: 0.35rem;
    }
    .required-star { color: #dc2626; }

    /* Location lock */
    .location-display {
      display: flex; align-items: center; gap: 0.6rem;
      padding: 0.6rem 0.875rem;
      background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 8px;
      font-size: 13px; font-weight: 600; color: #334155;
    }
    .location-display i { color: #004b87; font-size: 13px; flex-shrink: 0; }
    .location-lock { font-size: 10px; color: #94a3b8; margin-left: auto; font-weight: 400; }

    /* Drop zone */
    .dropzone {
      border: 2px dashed #cbd5e1; border-radius: 10px;
      padding: 1.5rem; text-align: center; cursor: pointer;
      transition: border-color 0.15s, background 0.15s;
      position: relative;
    }
    .dropzone:hover, .dropzone.drag-over { border-color: #004b87; background: #eff6ff; }
    .dropzone input { position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%; }
    .dropzone-icon { font-size: 22px; color: #94a3b8; display: block; margin-bottom: 0.5rem; }
    .dropzone-title { font-size: 13px; font-weight: 600; color: #475569; }
    .dropzone-sub   { font-size: 11px; color: #94a3b8; margin-top: 3px; }

    /* File list */
    .file-list { display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.625rem; }
    .file-item {
      display: flex; flex-direction: column; gap: 0.35rem;
      background: #f0fdf4; border: 1px solid #86efac; border-radius: 7px;
      padding: 0.5rem 0.75rem; font-size: 12px; color: #15803d;
    }
    .file-item-row {
      display: flex; align-items: center; gap: 0.5rem;
    }
    .file-item i { font-size: 12px; flex-shrink: 0; }
    .file-item-name { flex: 1; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .file-remove {
      background: none; border: none; cursor: pointer; color: #86efac;
      font-size: 12px; padding: 0; flex-shrink: 0; line-height: 1;
      transition: color 0.1s;
    }
    .file-remove:hover { color: #dc2626; }
    .bol-number-row {
      display: flex; align-items: center; gap: 0.4rem;
    }
    .bol-number-row label {
      font-size: 11px; font-weight: 600; color: #64748b; white-space: nowrap; min-width: 72px;
    }
    .bol-number-row input {
      flex: 1; font-size: 12px; padding: 0.25rem 0.5rem;
      border: 1px solid #86efac; border-radius: 5px;
      background: #fff; color: #0f172a; font-family: inherit;
      outline: none;
    }
    .bol-number-row input:focus { border-color: #004b87; }

    /* Error */
    .error-bar {
      padding: 0.75rem 1rem; background: #fef2f2; border: 1px solid #fca5a5;
      border-radius: 8px; font-size: 12px; color: #dc2626;
      display: flex; align-items: center; gap: 0.5rem;
    }

    .card-footer {
      padding: 1rem 1.5rem; border-top: 1px solid #f1f5f9;
      display: flex; justify-content: flex-end; gap: 0.75rem;
    }
  `],
  template: `
    <div class="layout">
      <button type="button" class="back-btn" (click)="router.navigate(['/repository'])">
        <i class="pi pi-arrow-left"></i> Back to Dashboard
      </button>

      <div class="card">
        <div class="card-header">
          <h2 class="card-title">New Shipment</h2>
          <p class="card-sub">Upload BOL documents — the driver will search by shipment number.</p>
        </div>

        <div class="card-body">

          @if (error()) {
            <div class="error-bar">
              <i class="pi pi-times-circle"></i>
              {{ error() }}
            </div>
          }

          <!-- Shipment Number -->
          <div class="field">
            <label>
              Shipment Number
              <span class="required-star">*</span>
            </label>
            <input
              pInputText
              type="text"
              [(ngModel)]="shipmentNumber"
              placeholder="e.g. ATL-2026-001"
              [disabled]="submitting()"
            />
          </div>

          <!-- Carrier Name -->
          <div class="field">
            <label>Carrier Name</label>
            <input
              pInputText
              type="text"
              [(ngModel)]="carrierName"
              placeholder="e.g. TRANSFLO CARRIER LLC"
              [disabled]="submitting()"
            />
          </div>

          <!-- Pickup Location (locked) -->
          <div class="field">
            <label>Pickup Location</label>
            <div class="location-display">
              <i class="pi pi-map-marker"></i>
              TRANSFLO ATLANTA DEPOT
              <span class="location-lock"><i class="pi pi-lock"></i> Fixed for demo</span>
            </div>
          </div>

          <!-- BOL PDFs -->
          <div class="field">
            <label>
              BOL Documents (PDF)
              <span class="required-star">*</span>
            </label>

            <div
              class="dropzone"
              [class.drag-over]="dragging()"
              (dragover)="$event.preventDefault(); dragging.set(true)"
              (dragleave)="dragging.set(false)"
              (drop)="onDrop($event)"
            >
              <input
                type="file"
                accept=".pdf,application/pdf"
                multiple
                (change)="onFileChange($event)"
                [disabled]="submitting()"
              />
              <i class="pi pi-file-pdf dropzone-icon"></i>
              <div class="dropzone-title">Drop PDFs here or click to browse</div>
              <div class="dropzone-sub">One PDF per BOL &mdash; multiple files allowed</div>
            </div>

            @if (files().length) {
              <div class="file-list">
                @for (entry of files(); track entry.file.name; let i = $index) {
                  <div class="file-item">
                    <div class="file-item-row">
                      <i class="pi pi-file-pdf"></i>
                      <span class="file-item-name">{{ entry.file.name }}</span>
                      <button type="button" class="file-remove" (click)="removeFile(entry)" [disabled]="submitting()">
                        <i class="pi pi-times"></i>
                      </button>
                    </div>
                    <div class="bol-number-row">
                      <label>BOL Number</label>
                      <input
                        type="text"
                        [value]="entry.bolNumber"
                        (input)="updateBolNumber(i, $any($event.target).value)"
                        placeholder="e.g. ATL-BOL-2026-001"
                        [disabled]="submitting()"
                      />
                    </div>
                  </div>
                }
              </div>
            }
          </div>

        </div>

        <div class="card-footer">
          <p-button
            label="Cancel"
            severity="secondary"
            [text]="true"
            [disabled]="submitting()"
            (click)="router.navigate(['/repository'])"
          />
          <p-button
            [label]="submitting() ? 'Creating…' : 'Create Shipment'"
            icon="pi pi-upload"
            [loading]="submitting()"
            [disabled]="!canSubmit()"
            (click)="submit()"
          />
        </div>
      </div>
    </div>
  `,
})
export class ShipmentNewComponent {
  router = inject(Router);
  private bols = inject(BolsService);

  shipmentNumber = '';
  carrierName = '';
  files = signal<FileEntry[]>([]);
  dragging = signal(false);
  submitting = signal(false);
  error = signal<string | null>(null);

  canSubmit(): boolean {
    const entries = this.files();
    return (
      this.shipmentNumber.trim().length > 0 &&
      entries.length > 0 &&
      entries.every(e => e.bolNumber.trim().length > 0) &&
      !this.submitting()
    );
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) this.addFiles(Array.from(input.files));
    input.value = '';
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    const dropped = Array.from(event.dataTransfer?.files ?? []).filter(
      f => f.type === 'application/pdf' || f.name.endsWith('.pdf'),
    );
    this.addFiles(dropped);
  }

  private addFiles(incoming: File[]): void {
    const existing = this.files();
    const names = new Set(existing.map(e => e.file.name));
    const next = existing.length;
    const newEntries: FileEntry[] = incoming
      .filter(f => !names.has(f.name))
      .map((f, i) => ({
        file: f,
        bolNumber: `${this.shipmentNumber.trim() || 'BOL'}-${next + i + 1}`,
      }));
    this.files.set([...existing, ...newEntries]);
  }

  updateBolNumber(index: number, value: string): void {
    const entries = [...this.files()];
    entries[index] = { ...entries[index], bolNumber: value };
    this.files.set(entries);
  }

  removeFile(entry: FileEntry): void {
    this.files.update(list => list.filter(e => e !== entry));
  }

  async submit(): Promise<void> {
    if (!this.canSubmit()) return;
    this.submitting.set(true);
    this.error.set(null);
    try {
      await this.bols.createShipmentWithBols(
        this.shipmentNumber.trim(),
        this.carrierName.trim(),
        this.files(),
      );
      void this.router.navigate(['/repository'], { queryParams: { uploaded: '1' } });
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Upload failed. Please try again.');
    } finally {
      this.submitting.set(false);
    }
  }
}
