import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { DomSanitizer } from '@angular/platform-browser';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { BolsService } from '../bols.service';
import { LocationsService, type Location } from '../../locations/locations.service';

type AiState = 'idle' | 'scanning' | 'filling' | 'done';

@Component({
  selector: 'ebol-upload',
  imports: [ReactiveFormsModule, ButtonModule, InputTextModule, SelectModule],
  host: { class: 'upload-host' },
  styles: [`
    /* ─── Gradient border @property ─────────────────── */
    @property --ai-angle {
      syntax: '<angle>';
      initial-value: 0deg;
      inherits: false;
    }
    @keyframes fade-up {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes ai-spin {
      to { --ai-angle: 360deg; }
    }
    @keyframes scan-beam {
      0%   { top: -100px; opacity: 0; }
      10%  { opacity: 1; }
      90%  { opacity: 1; }
      100% { top: 100%; opacity: 0; }
    }
    @keyframes ai-pulse {
      0%, 100% { opacity: 1; }
      50%       { opacity: 0.4; }
    }
    @keyframes shimmer {
      from { background-position: -200% center; }
      to   { background-position: 200% center; }
    }

    :host { display: flex; flex: 1; min-height: 0; overflow: hidden; }
    .layout { display: flex; flex: 1; min-height: 0; overflow: hidden; }

    /* ── LEFT ──────────────────────────────────────── */
    .doc-panel {
      flex: 1; min-width: 0; min-height: 0;
      background: #0f172a;
      display: flex; flex-direction: column; overflow: hidden;
      position: relative;
    }
    .doc-topbar {
      flex-shrink: 0; display: flex; align-items: center; gap: 0.75rem;
      padding: 0 1.25rem; height: 44px;
      background: #0f172a; border-bottom: 1px solid rgba(255,255,255,0.07);
    }
    .doc-label {
      font-size: 11px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.1em; color: rgba(255,255,255,0.3);
      flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .change-file-btn {
      flex-shrink: 0; font-size: 11px; color: #60a5fa;
      background: none; border: 1px solid rgba(96,165,250,0.25); border-radius: 5px;
      padding: 3px 10px; cursor: pointer; font-family: inherit; transition: background 0.15s;
      white-space: nowrap;
    }
    .change-file-btn:hover { background: rgba(96,165,250,0.1); }
    .doc-viewer {
      flex: 1; min-height: 0; display: block; width: 100%; height: 100%;
      border: none; background: #0f172a;
    }
    .doc-img {
      flex: 1; min-height: 0; width: 100%; object-fit: contain; display: block;
      padding: 1.5rem; box-sizing: border-box;
    }

    /* Scanning overlay */
    .scan-overlay {
      position: absolute; inset: 44px 0 0; pointer-events: none; overflow: hidden;
      z-index: 20;
    }
    .scan-beam {
      position: absolute; left: 0; right: 0; height: 120px;
      background: linear-gradient(180deg,
        transparent 0%,
        rgba(99,102,241,0.08) 20%,
        rgba(139,92,246,0.18) 50%,
        rgba(99,102,241,0.08) 80%,
        transparent 100%);
      animation: scan-beam 2s ease-in-out infinite;
    }
    .scan-line {
      position: absolute; left: 0; right: 0; height: 1.5px;
      background: linear-gradient(90deg, transparent, #818cf8, #c084fc, #38bdf8, transparent);
      top: 50%; transform: translateY(-50%);
      filter: blur(0.5px);
    }

    /* Drop zone */
    .dropzone-area {
      flex: 1; min-height: 0; display: flex; align-items: center;
      justify-content: center; cursor: pointer;
    }
    .dropzone {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; gap: 0.75rem; width: 320px; padding: 3rem 2rem;
      border: 2px dashed rgba(255,255,255,0.12); border-radius: 16px;
      text-align: center; transition: border-color 0.2s, background 0.2s;
    }
    .dropzone:hover, .dropzone.drag-over {
      border-color: rgba(99,179,237,0.45); background: rgba(99,179,237,0.04);
    }
    .dropzone-icon {
      width: 56px; height: 56px; border-radius: 14px;
      background: rgba(255,255,255,0.06);
      display: flex; align-items: center; justify-content: center;
      font-size: 22px; color: rgba(255,255,255,0.4);
    }
    .dropzone-title { font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.75); }
    .dropzone-sub   { font-size: 12px; color: rgba(255,255,255,0.3); }
    .dropzone-types { font-size: 11px; color: rgba(255,255,255,0.2); margin-top: 0.2rem; }
    .file-error {
      flex-shrink: 0; padding: 6px 1.25rem; font-size: 12px;
      color: #f87171; background: rgba(239,68,68,0.1); text-align: center;
    }

    /* ── RIGHT ─────────────────────────────────────── */
    .form-panel {
      width: 480px; flex-shrink: 0; background: #f8fafc;
      border-left: 1px solid #e2e8f0;
      display: flex; flex-direction: column; height: 100%; overflow: hidden;
    }
    .form-header {
      flex-shrink: 0; background: #fff; border-bottom: 1px solid #e2e8f0;
    }
    .form-header-inner {
      display: flex; align-items: center; min-height: 58px; padding: 0 1.5rem;
    }
    .form-title  { font-size: 15px; font-weight: 700; color: #0f172a; margin: 0; flex: 1; }
    .form-sub    { font-size: 11px; color: #94a3b8; margin: 2px 0 0; }

    /* AI banner */
    .ai-banner {
      display: flex; align-items: center; gap: 0.75rem;
      padding: 0.625rem 1.25rem; border-top: 1px solid #e0e7ff;
      background: linear-gradient(135deg, #eef2ff 0%, #faf5ff 100%);
    }
    .ai-banner-icon {
      font-size: 16px; flex-shrink: 0;
      background: linear-gradient(135deg, #6366f1, #a855f7);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .ai-banner-body { flex: 1; min-width: 0; }
    .ai-banner-title { font-size: 12px; font-weight: 700; color: #3730a3; }
    .ai-banner-sub   { font-size: 11px; color: #6366f1; margin-top: 1px; }
    .ai-fill-btn {
      flex-shrink: 0; height: 28px; padding: 0 12px;
      background: linear-gradient(135deg, #6366f1, #a855f7);
      color: #fff; border: none; border-radius: 7px;
      font-size: 12px; font-weight: 700; font-family: inherit; cursor: pointer;
      transition: opacity 0.15s; white-space: nowrap;
    }
    .ai-fill-btn:hover { opacity: 0.88; }
    .ai-dismiss-btn {
      flex-shrink: 0; background: none; border: none; cursor: pointer;
      color: #a5b4fc; font-size: 16px; line-height: 1; padding: 2px;
    }

    /* Scanning state in header */
    .ai-scanning-bar {
      display: flex; align-items: center; gap: 0.75rem;
      padding: 0.625rem 1.25rem; border-top: 1px solid #e0e7ff;
      background: linear-gradient(135deg, #eef2ff 0%, #faf5ff 100%);
    }
    .ai-scanning-icon {
      font-size: 14px; color: #818cf8; animation: ai-pulse 1s ease-in-out infinite;
    }
    .ai-scanning-text {
      font-size: 12px; font-weight: 700; color: #3730a3; flex: 1;
      background: linear-gradient(90deg, #6366f1 0%, #a855f7 33%, #38bdf8 66%, #6366f1 100%);
      background-size: 200% auto;
      -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
      animation: shimmer 2s linear infinite;
    }

    /* Done badge */
    .ai-done-bar {
      display: flex; align-items: center; gap: 0.5rem;
      padding: 0.5rem 1.25rem; border-top: 1px solid #d1fae5;
      background: #f0fdf4;
    }
    .ai-done-text { font-size: 12px; font-weight: 600; color: #15803d; flex: 1; }

    /* ── FORM BODY ──────────────────────────────────── */
    .form-body { flex: 1; overflow-y: auto; padding: 1.25rem 1.5rem 1.5rem; }
    .form-body::-webkit-scrollbar { width: 4px; }
    .form-body::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
    .form-section {
      background: #fff; border: 1px solid #e2e8f0; border-radius: 10px;
      padding: 1rem; margin-bottom: 0.875rem; animation: fade-up 0.2s ease-out both;
    }
    .section-title {
      font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;
      color: #004b87; margin: 0 0 0.875rem; display: flex; align-items: center; gap: 0.4rem;
    }
    .field { margin-bottom: 0.875rem; }
    .field:last-child { margin-bottom: 0; }
    .field label {
      display: block; font-size: 12px; font-weight: 600;
      color: #475569; margin-bottom: 0.3rem; display: flex; align-items: center; gap: 0.35rem;
    }
    .field input {
      width: 100%; height: 36px; padding: 0 0.75rem;
      border: 1.5px solid #e2e8f0; border-radius: 7px;
      font-size: 13px; font-family: inherit; color: #1e293b;
      background: #f8fafc; outline: none; box-sizing: border-box;
      transition: border-color 0.15s, background 0.15s;
    }
    .field input:focus { border-color: #004b87; background: #fff; }
    .field input::placeholder { color: #94a3b8; }
    .field input:read-only { color: #94a3b8; cursor: default; background: #f8fafc; }
    .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
    .error-msg  { font-size: 11px; color: #dc2626; margin-top: 3px; }
    .field-hint { font-size: 11px; color: #94a3b8; font-weight: 400; }

    /* ── AI GRADIENT BORDER ─────────────────────────── */
    .field-ai-active input,
    .field-ai-active-select .p-select {
      border: 1.5px solid transparent !important;
      background:
        linear-gradient(#fff, #fff) padding-box,
        conic-gradient(from var(--ai-angle), #6366f1, #a855f7, #ec4899, #06b6d4, #6366f1) border-box !important;
      animation: ai-spin 1.2s linear infinite !important;
    }
    .field-ai-done input {
      border-color: #c7d2fe !important;
      background: #fafaff !important;
    }
    .field-ai-done-select .p-select {
      border-color: #c7d2fe !important;
      background: #fafaff !important;
    }

    /* AI badge on labels */
    .ai-badge {
      font-size: 10px; font-weight: 700; color: #818cf8;
      background: #eef2ff; padding: 1px 5px; border-radius: 4px;
      letter-spacing: 0.02em; flex-shrink: 0;
    }
    .ai-badge-warn {
      font-size: 10px; font-weight: 700; color: #b45309;
      background: #fef3c7; padding: 1px 5px; border-radius: 4px;
      letter-spacing: 0.02em; flex-shrink: 0;
    }

    /* Not-extracted field state */
    .field-ai-skipped-select .p-select {
      border-color: #f59e0b !important;
      background: #fffbeb !important;
    }
    .ai-skipped-msg {
      font-size: 11px; color: #b45309; margin-top: 3px;
      display: flex; align-items: center; gap: 3px; font-weight: 600;
    }

    /* ── STOPS ──────────────────────────────────────── */
    .stops-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .stop-card {
      border: 1.5px solid #e2e8f0; border-radius: 10px;
      overflow: hidden; background: #fff;
    }
    .stop-card-header {
      display: flex; align-items: center; padding: 0.6rem 0.875rem;
      background: #f8fafc; border-bottom: 1px solid #e2e8f0;
    }
    .stop-number {
      width: 22px; height: 22px; border-radius: 50%;
      background: #004b87; color: #fff;
      font-size: 11px; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; margin-right: 0.5rem;
    }
    .stop-card-title { font-size: 12px; font-weight: 700; color: #0f172a; flex: 1; }
    .stop-remove-btn {
      background: none; border: none; color: #94a3b8; cursor: pointer;
      font-size: 13px; padding: 2px 4px; border-radius: 4px;
      transition: color 0.15s, background 0.15s;
    }
    .stop-remove-btn:hover { color: #dc2626; background: #fef2f2; }
    .stop-card-body { padding: 0.875rem; }

    /* ── PAGE ASSIGNMENT ────────────────────────────── */
    .pages-section {
      margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid #f1f5f9;
    }
    .pages-label {
      font-size: 11px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.07em; color: #64748b; margin-bottom: 0.5rem;
      display: flex; align-items: center; gap: 0.35rem;
    }
    .pages-chips { display: flex; flex-wrap: wrap; gap: 0.375rem; min-height: 28px; }
    .page-chip {
      display: inline-flex; align-items: center; gap: 4px;
      height: 24px; padding: 0 8px 0 10px; border-radius: 12px;
      font-size: 11px; font-weight: 700; cursor: default; border: none; font-family: inherit;
    }
    .page-chip.assigned {
      background: #dbeafe; color: #1d4ed8; cursor: pointer;
    }
    .page-chip.assigned:hover { background: #bfdbfe; }
    .page-chip.assigned .chip-remove {
      display: inline-flex; align-items: center; justify-content: center;
      width: 14px; height: 14px; border-radius: 50%;
      background: rgba(29,78,216,0.15); font-size: 9px; color: #1d4ed8;
      cursor: pointer; border: none; font-family: inherit; padding: 0; line-height: 1;
    }
    .page-chip.assigned .chip-remove:hover { background: rgba(29,78,216,0.3); }
    .page-chip.unassigned {
      background: #f1f5f9; color: #94a3b8;
      border: 1.5px dashed #cbd5e1; cursor: pointer; padding: 0 8px;
    }
    .page-chip.unassigned:hover { background: #eff6ff; color: #1d4ed8; border-color: #93c5fd; }
    .pages-empty { font-size: 11px; color: #cbd5e1; font-style: italic; }
    .pages-warning {
      display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.75rem;
      background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px;
      margin-bottom: 0.75rem; font-size: 12px; color: #c2410c; font-weight: 600;
    }

    /* ── ADD STOP ───────────────────────────────────── */
    .add-stop-btn {
      display: flex; align-items: center; justify-content: center; gap: 0.4rem;
      width: 100%; padding: 0.6rem;
      background: #fff; border: 1.5px dashed #93c5fd; border-radius: 8px;
      color: #1d4ed8; font-size: 13px; font-weight: 600; font-family: inherit;
      cursor: pointer; transition: background 0.15s, border-color 0.15s; margin-top: 0.75rem;
    }
    .add-stop-btn:hover { background: #eff6ff; border-color: #3b82f6; }

    /* ── FOOTER ─────────────────────────────────────── */
    .form-footer {
      flex-shrink: 0; padding: 1rem 1.5rem; background: #fff;
      border-top: 1px solid #e2e8f0;
      display: flex; align-items: center; justify-content: flex-end; gap: 0.75rem;
    }
    .cancel-btn {
      height: 38px; padding: 0 1.25rem; background: #f1f5f9; color: #475569; border: none;
      border-radius: 8px; font-size: 13px; font-weight: 600; font-family: inherit;
      cursor: pointer; transition: background 0.15s;
    }
    .cancel-btn:hover { background: #e2e8f0; }
    .submit-btn {
      height: 38px; padding: 0 1.5rem; background: #004b87; color: #fff; border: none;
      border-radius: 8px; font-size: 13px; font-weight: 600; font-family: inherit;
      cursor: pointer; display: flex; align-items: center; gap: 0.4rem;
      transition: background 0.15s, opacity 0.15s;
    }
    .submit-btn:hover:not(:disabled) { background: #003d70; }
    .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  `],
  template: `
    <input
      #fileInput type="file"
      accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/*"
      style="display:none"
      (change)="onFileChange($event)"
    />

    <div class="layout">

      <!-- LEFT: Document panel -->
      <div
        class="doc-panel"
        (dragover)="onDragOver($event)"
        (dragleave)="dragOver.set(false)"
        (drop)="onDrop($event)"
      >
        @if (selectedFile()) {
          <div class="doc-topbar">
            <span class="doc-label">{{ selectedFile()!.name }}</span>
            <button type="button" class="change-file-btn" (click)="fileInput.click()">Change file</button>
          </div>

          @if (aiState() === 'scanning') {
            <div class="scan-overlay">
              <div class="scan-beam">
                <div class="scan-line"></div>
              </div>
            </div>
          }

          @if (isImage()) {
            <img class="doc-img" [src]="objectUrl()" [alt]="selectedFile()!.name" />
          } @else {
            <iframe class="doc-viewer" [src]="safeUrl()" title="BOL Document"></iframe>
          }
        } @else {
          <div class="dropzone-area" (click)="fileInput.click()">
            <div class="dropzone" [class.drag-over]="dragOver()">
              <div class="dropzone-icon"><i class="pi pi-cloud-upload"></i></div>
              <div class="dropzone-title">Drop your BOL here</div>
              <div class="dropzone-sub">or click to browse files</div>
              <div class="dropzone-types">PDF · PNG · JPG</div>
            </div>
          </div>
        }

        @if (fileError()) {
          <div class="file-error"><i class="pi pi-exclamation-circle"></i> {{ fileError() }}</div>
        }
      </div>

      <!-- RIGHT: Form panel -->
      <aside class="form-panel">
        <div class="form-header">
          <div class="form-header-inner">
            <div style="flex:1; min-width:0;">
              <p class="form-title">Upload BOL</p>
              <p class="form-sub">Fill in shipment details and define stops</p>
            </div>
          </div>

          <!-- AI banner — shown when file loaded & AI hasn't run yet -->
          @if (selectedFile() && aiState() === 'idle') {
            <div class="ai-banner">
              <span class="ai-banner-icon">✦</span>
              <div class="ai-banner-body">
                <div class="ai-banner-title">AI detected document content</div>
                <div class="ai-banner-sub">Auto-fill the form with extracted data</div>
              </div>
              <button type="button" class="ai-fill-btn" (click)="runAiFill()">
                <i class="pi pi-sparkles" style="margin-right:4px;font-size:11px;"></i>Auto-fill
              </button>
              <button type="button" class="ai-dismiss-btn" (click)="dismissAiBanner()">×</button>
            </div>
          }

          <!-- Scanning state -->
          @if (aiState() === 'scanning' || aiState() === 'filling') {
            <div class="ai-scanning-bar">
              <i class="pi pi-spin pi-spinner ai-scanning-icon"></i>
              <span class="ai-scanning-text">
                {{ aiState() === 'scanning' ? 'Analyzing document…' : 'Filling form with extracted data…' }}
              </span>
            </div>
          }

          <!-- Done state -->
          @if (aiState() === 'done') {
            <div class="ai-done-bar">
              <i class="pi pi-check-circle" style="color:#16a34a;font-size:14px;"></i>
              <span class="ai-done-text">Form filled — review and submit when ready</span>
            </div>
          }
        </div>

        <div class="form-body" [formGroup]="form">

          <div class="form-section">
            <p class="section-title"><i class="pi pi-file-edit"></i> Document Info</p>

            <div class="field-row">
              <div class="field"
                [class.field-ai-active]="aiActiveField() === 'shipmentNumber'"
                [class.field-ai-done]="isAiDone('shipmentNumber')">
                <label>
                  Shipment ID *
                  @if (isAiDone('shipmentNumber')) { <span class="ai-badge">✦ AI</span> }
                </label>
                <input type="text" formControlName="shipmentNumber" placeholder="SHP-2025-001" />
                @if (form.get('shipmentNumber')?.invalid && form.get('shipmentNumber')?.touched) {
                  <div class="error-msg">Required</div>
                }
              </div>
              <div class="field"
                [class.field-ai-active]="aiActiveField() === 'bolNumber'"
                [class.field-ai-done]="isAiDone('bolNumber')">
                <label>
                  BOL Number
                  @if (isAiDone('bolNumber')) { <span class="ai-badge">✦ AI</span> }
                </label>
                <input type="text" formControlName="bolNumber" placeholder="BOL-001" />
              </div>
            </div>

            <div class="field"
              [class.field-ai-active-select]="aiActiveField() === 'pickupLocationId'"
              [class.field-ai-done-select]="isAiDone('pickupLocationId')"
              [class.field-ai-skipped-select]="isAiSkipped('pickupLocationId')">
              <label>
                Pickup Location *
                @if (isAiDone('pickupLocationId')) { <span class="ai-badge">✦ AI</span> }
                @if (isAiSkipped('pickupLocationId')) { <span class="ai-badge-warn">⚠ Not extracted</span> }
              </label>
              <p-select
                formControlName="pickupLocationId"
                [options]="locationOptions()"
                optionLabel="label"
                optionValue="value"
                placeholder="Select location"
                [showClear]="true"
                [style]="{ width: '100%', height: '36px', fontSize: '13px' }"
              />
              @if (isAiSkipped('pickupLocationId') && !form.get('pickupLocationId')?.value) {
                <div class="ai-skipped-msg">
                  <i class="pi pi-exclamation-circle"></i> Location name not found — please select manually
                </div>
              }
              @if (form.get('pickupLocationId')?.invalid && form.get('pickupLocationId')?.touched && !isAiSkipped('pickupLocationId')) {
                <div class="error-msg">Required</div>
              }
            </div>

            <div class="field-row">
              <div class="field"
                [class.field-ai-active]="aiActiveField() === 'scacCode'"
                [class.field-ai-done]="isAiDone('scacCode')">
                <label>
                  SCAC Code *
                  @if (isAiDone('scacCode')) { <span class="ai-badge">✦ AI</span> }
                </label>
                <input type="text" formControlName="scacCode" placeholder="ABCD" maxlength="4" style="text-transform:uppercase" />
                @if (form.get('scacCode')?.invalid && form.get('scacCode')?.touched) {
                  <div class="error-msg">Required</div>
                }
              </div>
              <div class="field"
                [class.field-ai-active]="aiActiveField() === 'carrierDot'"
                [class.field-ai-done]="isAiDone('carrierDot')">
                <label>
                  Carrier DOT # <span class="field-hint">(optional)</span>
                  @if (isAiDone('carrierDot')) { <span class="ai-badge">✦ AI</span> }
                </label>
                <input type="text" formControlName="carrierDot" placeholder="1234567" />
              </div>
            </div>
          </div>

          <div class="form-section" style="animation-delay:0.05s">
            <p class="section-title"><i class="pi pi-map-marker"></i> Stops</p>

            @if (hasUnassignedPages()) {
              <div class="pages-warning">
                <i class="pi pi-exclamation-triangle"></i>
                {{ unassignedPages().length }} page{{ unassignedPages().length === 1 ? '' : 's' }} not yet assigned
              </div>
            }

            <div class="stops-list" formArrayName="stops">
              @for (stopCtrl of stopsArray.controls; track $index; let i = $index) {
                <div class="stop-card" [formGroupName]="i">
                  <div class="stop-card-header">
                    <span class="stop-number">{{ i + 1 }}</span>
                    <span class="stop-card-title">Stop {{ i + 1 }}</span>
                    @if (stopsArray.length > 1) {
                      <button type="button" class="stop-remove-btn" (click)="removeStop(i)">
                        <i class="pi pi-times"></i>
                      </button>
                    }
                  </div>
                  <div class="stop-card-body">
                    <div class="field"
                      [class.field-ai-active]="aiActiveField() === 'stop-' + i + '-stopName'"
                      [class.field-ai-done]="isAiDone('stop-' + i + '-stopName')">
                      <label>
                        Stop Name *
                        @if (isAiDone('stop-' + i + '-stopName')) { <span class="ai-badge">✦ AI</span> }
                      </label>
                      <input type="text" formControlName="stopName" placeholder="e.g. Chicago Warehouse" />
                      @if (stopCtrl.get('stopName')?.invalid && stopCtrl.get('stopName')?.touched) {
                        <div class="error-msg">Required</div>
                      }
                    </div>
                    <div class="field-row">
                      <div class="field">
                        <label>Shipment ID</label>
                        <input type="text" formControlName="shipmentId" readonly
                          placeholder="Auto-filled" />
                      </div>
                      <div class="field"
                        [class.field-ai-active]="aiActiveField() === 'stop-' + i + '-bolNumber'"
                        [class.field-ai-done]="isAiDone('stop-' + i + '-bolNumber')">
                        <label>
                          BOL #
                          @if (isAiDone('stop-' + i + '-bolNumber')) { <span class="ai-badge">✦ AI</span> }
                        </label>
                        <input type="text" formControlName="bolNumber" placeholder="BOL-001" />
                      </div>
                    </div>

                    @if (stopsArray.length > 1 && pageCount() > 0) {
                      <div class="pages-section">
                        <div class="pages-label"><i class="pi pi-file"></i> Pages</div>
                        <div class="pages-chips">
                          @for (page of getStopPages(i); track page) {
                            <button type="button" class="page-chip assigned" (click)="unassignPage(page)">
                              P{{ page }}
                              <span class="chip-remove"><i class="pi pi-times"></i></span>
                            </button>
                          }
                          @for (page of unassignedPages(); track page) {
                            <button type="button" class="page-chip unassigned" (click)="assignPage(page, i)">
                              + P{{ page }}
                            </button>
                          }
                          @if (getStopPages(i).length === 0 && unassignedPages().length === 0) {
                            <span class="pages-empty">No pages assigned</span>
                          }
                          @if (getStopPages(i).length === 0 && unassignedPages().length > 0) {
                            <span class="pages-empty">Click a page above to assign it here</span>
                          }
                        </div>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>

            <button type="button" class="add-stop-btn" (click)="addStop()">
              <i class="pi pi-plus"></i> Add Stop
            </button>
          </div>

        </div>

        <div class="form-footer">
          <button type="button" class="cancel-btn" (click)="reset()">Clear</button>
          <button
            type="button"
            class="submit-btn"
            [disabled]="form.invalid || !selectedFile() || uploading() || hasUnassignedPages()"
            (click)="onSubmit()"
          >
            @if (uploading()) {
              <i class="pi pi-spin pi-spinner"></i> {{ uploadStatus() }}
            } @else {
              <i class="pi pi-upload"></i> Upload BOL
            }
          </button>
        </div>
      </aside>
    </div>
  `,
})
export class UploadComponent implements OnInit, OnDestroy {
  private bolsService = inject(BolsService);
  private locationsService = inject(LocationsService);
  private messageService = inject(MessageService);
  private router = inject(Router);
  private sanitizer = inject(DomSanitizer);
  private fb = inject(FormBuilder);

  locationOptions = signal<{ label: string; value: string }[]>([]);
  selectedFile = signal<File | null>(null);
  fileError = signal('');
  dragOver = signal(false);
  uploading = signal(false);
  uploadStatus = signal('Uploading…');

  objectUrl = signal<string | null>(null);
  isImage = signal(false);
  safeUrl = computed(() => {
    const url = this.objectUrl();
    return url ? this.sanitizer.bypassSecurityTrustResourceUrl(url) : null;
  });

  pageCount = signal(0);
  private pageAssignments = signal<number[]>([]);

  aiState = signal<AiState>('idle');
  aiActiveField = signal<string | null>(null);
  private aiFilledFields = signal<Set<string>>(new Set());
  private aiSkippedFields = signal<Set<string>>(new Set());

  form = this.fb.group({
    shipmentNumber: ['', Validators.required],
    bolNumber: [''],
    pickupLocationId: [null as string | null, Validators.required],
    scacCode: ['', Validators.required],
    carrierDot: [''],
    stops: this.fb.array([this.makeStop()]),
  });

  get stopsArray(): FormArray { return this.form.get('stops') as FormArray; }

  isAiDone(key: string): boolean    { return this.aiFilledFields().has(key); }
  isAiSkipped(key: string): boolean { return this.aiSkippedFields().has(key); }

  unassignedPages(): number[] {
    return this.pageAssignments()
      .map((stop, i) => ({ stop, page: i + 1 }))
      .filter(x => x.stop === -1)
      .map(x => x.page);
  }

  hasUnassignedPages(): boolean {
    return this.stopsArray.length > 1 && this.unassignedPages().length > 0;
  }

  getStopPages(stopIndex: number): number[] {
    return this.pageAssignments()
      .map((stop, i) => ({ stop, page: i + 1 }))
      .filter(x => x.stop === stopIndex)
      .map(x => x.page);
  }

  assignPage(page: number, stopIndex: number): void {
    const arr = [...this.pageAssignments()];
    arr[page - 1] = stopIndex;
    this.pageAssignments.set(arr);
  }

  unassignPage(page: number): void {
    const arr = [...this.pageAssignments()];
    arr[page - 1] = -1;
    this.pageAssignments.set(arr);
  }

  // ─── AI Fill ────────────────────────────────────────────────────────────────

  dismissAiBanner(): void { this.aiState.set('done'); }

  async runAiFill(): Promise<void> {
    if (this.aiState() !== 'idle') return;

    // ① Scanning phase — beam animates over the document
    this.aiState.set('scanning');
    await this.wait(2000);

    // ② Filling phase
    this.aiState.set('filling');

    const demoShipNum = 'SHIP-' + new Date().toISOString().slice(2, 10).replace(/-/g, '') + '-' + Math.floor(Math.random() * 900 + 100);
    await this.typeField('shipmentNumber', demoShipNum);
    await this.wait(180);

    await this.typeField('bolNumber', 'MBOL-9001');
    await this.wait(180);

    await this.typeField('scacCode', 'TFLX');
    await this.wait(180);

    await this.typeField('carrierDot', '1234567');
    await this.wait(250);

    // Pickup location — find by partial name match
    await this.fillSelectField('pickupLocationId', 'transflo');
    await this.wait(300);

    // Stop 1
    await this.typeStopField(0, 'stopName', 'Walmart DC #1234');
    await this.wait(150);
    await this.typeStopField(0, 'bolNumber', 'BOL-1001-A');
    await this.wait(350);

    // Add Stop 2
    this.addStop();
    await this.wait(500);

    await this.typeStopField(1, 'stopName', 'Target DC #5678');
    await this.wait(150);
    await this.typeStopField(1, 'bolNumber', 'BOL-1002-A');
    await this.wait(350);

    // Assign pages — master BOL (1,2) + stop 1 BOL (3) → Stop 1; stop 2 BOLs (4,5) → Stop 2
    await this.assignPagesAnimated([
      { page: 1, stop: 0 }, { page: 2, stop: 0 }, { page: 3, stop: 0 },
      { page: 4, stop: 1 }, { page: 5, stop: 1 },
    ]);

    this.aiState.set('done');
  }

  private async typeField(key: string, value: string): Promise<void> {
    const ctrl = this.form.get(key);
    if (!ctrl) return;
    this.aiActiveField.set(key);
    ctrl.setValue('');
    for (const char of value) {
      ctrl.setValue(ctrl.value + char, { emitEvent: key === 'shipmentNumber' });
      await this.wait(55 + Math.random() * 35);
    }
    await this.wait(180);
    this.aiActiveField.set(null);
    this.markDone(key);
  }

  private async typeStopField(stopIndex: number, field: string, value: string): Promise<void> {
    const key = `stop-${stopIndex}-${field}`;
    const ctrl = this.stopsArray.at(stopIndex)?.get(field);
    if (!ctrl) return;
    this.aiActiveField.set(key);
    ctrl.setValue('');
    for (const char of value) {
      ctrl.setValue(ctrl.value + char);
      await this.wait(55 + Math.random() * 35);
    }
    await this.wait(180);
    this.aiActiveField.set(null);
    this.markDone(key);
  }

  private async fillSelectField(key: string, _partialName: string): Promise<void> {
    this.aiActiveField.set(key);
    await this.wait(900);
    // Intentionally not matched — shows the "not extracted" incomplete state
    this.aiSkippedFields.update(s => new Set([...s, key]));
    this.aiActiveField.set(null);
    await this.wait(200);
  }

  private async assignPagesAnimated(assignments: { page: number; stop: number }[]): Promise<void> {
    for (const { page, stop } of assignments) {
      if (page <= this.pageCount()) {
        this.assignPage(page, stop);
        await this.wait(120);
      }
    }
  }

  private markDone(key: string): void {
    this.aiFilledFields.update(s => new Set([...s, key]));
  }

  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ─── Form helpers ────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.loadLocations();
    this.form.get('shipmentNumber')!.valueChanges.subscribe((val) => {
      this.stopsArray.controls.forEach((c) =>
        c.get('shipmentId')?.setValue(val ?? '', { emitEvent: false })
      );
    });
  }

  ngOnDestroy(): void { this.revokeObjectUrl(); }

  private async loadLocations(): Promise<void> {
    try {
      const locs = await this.locationsService.list();
      this.locationOptions.set(locs.map((l: Location) => ({
        label: `${l.name} — ${l.city}, ${l.state}`,
        value: l.id,
      })));
    } catch { /* non-critical */ }
  }

  private makeStop(): FormGroup {
    return this.fb.group({
      stopName: ['', Validators.required],
      shipmentId: [{ value: '', disabled: true }],
      bolNumber: [''],
    });
  }

  addStop(): void {
    this.stopsArray.push(this.makeStop());
    if (this.stopsArray.length === 2 && this.pageCount() > 0) {
      this.pageAssignments.set(Array(this.pageCount()).fill(-1));
    }
  }

  removeStop(i: number): void {
    if (this.stopsArray.length <= 1) return;
    const arr = this.pageAssignments().map(s => s === i ? 0 : s > i ? s - 1 : s);
    this.pageAssignments.set(arr);
    this.stopsArray.removeAt(i);
    if (this.stopsArray.length === 1 && this.pageCount() > 0) {
      this.pageAssignments.set(Array(this.pageCount()).fill(0));
    }
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) this.setFile(input.files[0]);
    input.value = '';
  }

  onDragOver(event: DragEvent): void { event.preventDefault(); this.dragOver.set(true); }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) this.setFile(file);
  }

  private async setFile(file: File): Promise<void> {
    this.fileError.set('');
    if (!file.type.match(/^(application\/pdf|image\/(png|jpeg|jpg))$/) &&
        !file.name.match(/\.(pdf|png|jpg|jpeg)$/i)) {
      this.fileError.set('Only PDF, PNG, or JPG files are accepted.');
      return;
    }
    this.revokeObjectUrl();
    this.selectedFile.set(file);
    this.isImage.set(file.type.startsWith('image/'));
    this.objectUrl.set(URL.createObjectURL(file));
    this.aiState.set('idle');
    this.aiFilledFields.set(new Set());
    this.aiSkippedFields.set(new Set());

    const count = file.type.startsWith('image/') ? 1 : await this.detectPageCount(file);
    this.pageCount.set(count);
    this.pageAssignments.set(Array(count).fill(0));
  }

  private async detectPageCount(file: File): Promise<number> {
    try {
      const buf = await file.slice(0, 65536).arrayBuffer();
      const text = new TextDecoder('latin1').decode(buf);
      const match = text.match(/\/Count\s+(\d+)/);
      if (match) return Math.max(1, parseInt(match[1], 10));
    } catch { /* ignore */ }
    return 1;
  }

  private revokeObjectUrl(): void {
    const url = this.objectUrl();
    if (url) { URL.revokeObjectURL(url); this.objectUrl.set(null); }
  }

  reset(): void {
    this.form.reset();
    while (this.stopsArray.length > 1) this.stopsArray.removeAt(1);
    this.stopsArray.at(0).reset();
    this.selectedFile.set(null);
    this.fileError.set('');
    this.pageCount.set(0);
    this.pageAssignments.set([]);
    this.aiState.set('idle');
    this.aiFilledFields.set(new Set());
    this.aiSkippedFields.set(new Set());
    this.revokeObjectUrl();
  }

  async onSubmit(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid || !this.selectedFile() || this.hasUnassignedPages()) return;

    this.uploading.set(true);
    this.uploadStatus.set('Uploading document…');
    const val = this.form.getRawValue();
    const stops = (val.stops as { stopName: string; bolNumber: string }[]).map((s, i) => ({
      stopName: s.stopName,
      bolNumber: s.bolNumber || val.bolNumber || '',
      sequence: i + 1,
    }));

    try {
      this.uploadStatus.set('Creating shipment…');
      const bol = await this.bolsService.uploadBol({
        shipmentNumber: val.shipmentNumber!,
        carrierName: '',
        scacCode: val.scacCode!,
        carrierDot: val.carrierDot ?? '',
        pickupLocationId: val.pickupLocationId ?? null,
        multiStop: this.stopsArray.length > 1,
        stops,
        file: this.selectedFile()!,
      });
      this.messageService.add({
        severity: 'success', summary: 'BOL Uploaded',
        detail: `BOL ${bol.bol_number} uploaded successfully.`, life: 5000,
      });
      await this.router.navigate(['/repository'], { queryParams: { uploaded: '1' } });
    } catch (err) {
      this.messageService.add({
        severity: 'error', summary: 'Upload failed',
        detail: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      this.uploading.set(false);
      this.uploadStatus.set('Uploading…');
    }
  }
}
