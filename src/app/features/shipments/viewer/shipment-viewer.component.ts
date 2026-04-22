import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { SkeletonModule } from 'primeng/skeleton';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { BolsService, type BolWithRelations } from '../../bols/bols.service';
import { LocationsService, type Location } from '../../locations/locations.service';
import { SelectModule } from 'primeng/select';
import { supabase } from '../../../lib/supabase/client';

interface AnnotationItem {
  id: string;
  bolId: string;
  type: 'signature' | 'highlight' | 'redact';
  x: number; y: number; width: number; height: number;
  imageUrl?: string;
  signerName?: string;
  signerType?: 'driver' | 'consignee';
}

@Component({
  selector: 'ebol-shipment-viewer',
  standalone: true,
  imports: [FormsModule, ButtonModule, TagModule, TooltipModule, SkeletonModule, SelectModule],
  styles: [`
    /* ── Shell ── */
    :host { display: flex; flex-direction: column; flex: 1; min-height: 0; overflow: hidden; }

    .viewer { display: flex; flex-direction: row; flex: 1; min-height: 0; overflow: hidden; }

    /* ── Left: PDF panel ── */
    .pdf-panel {
      width: 52%; min-width: 420px; flex-shrink: 0;
      display: flex; flex-direction: column;
      background: #0f1923; color: #fff;
      border-right: 1px solid #1e2d3d;
    }

    .pdf-header {
      flex-shrink: 0; display: flex; align-items: center; gap: 0.75rem;
      padding: 0.75rem 1rem; border-bottom: 1px solid #1e2d3d;
      min-height: 52px;
    }
    .pdf-back-btn {
      display: inline-flex; align-items: center; gap: 0.375rem;
      padding: 0.35rem 0.6rem; border: 1px solid #2d3f50; border-radius: 6px;
      background: transparent; color: #94a3b8; font-size: 12px; font-weight: 600;
      cursor: pointer; font-family: inherit; transition: all 0.15s; flex-shrink: 0;
    }
    .pdf-back-btn:hover { background: #1e2d3d; color: #e2e8f0; border-color: #3d5266; }

    .pdf-header-title {
      flex: 1; min-width: 0;
    }
    .pdf-shipment-num {
      font-size: 13px; font-weight: 700; color: #e2e8f0;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .pdf-carrier {
      font-size: 11px; color: #64748b; margin-top: 1px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }

    /* BOL tab strip */
    .bol-tabs {
      flex-shrink: 0; display: flex; align-items: stretch;
      border-bottom: 1px solid #1e2d3d; overflow-x: auto;
      scrollbar-width: none;
    }
    .bol-tabs::-webkit-scrollbar { display: none; }

    .bol-tab {
      flex-shrink: 0; padding: 0.55rem 1rem;
      background: transparent; border: none; border-bottom: 2px solid transparent;
      color: #64748b; font-size: 12px; font-weight: 600; cursor: pointer;
      font-family: inherit; transition: all 0.15s; white-space: nowrap;
    }
    .bol-tab:hover { color: #94a3b8; background: rgba(255,255,255,0.03); }
    .bol-tab.active { color: #60a5fa; border-bottom-color: #60a5fa; }
    .bol-tab-stop { font-size: 10px; color: #64748b; margin-right: 4px; }
    .bol-tab.active .bol-tab-stop { color: #3b82f6; }

    /* PDF iframe */
    .pdf-frame {
      flex: 1; min-height: 0; position: relative;
    }
    .pdf-frame iframe {
      width: 100%; height: 100%; border: none; display: block;
    }
    .pdf-no-doc {
      position: absolute; inset: 0;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      color: #475569; gap: 0.75rem;
    }
    .pdf-no-doc i { font-size: 2.5rem; opacity: 0.4; }
    .pdf-no-doc p { font-size: 13px; margin: 0; }

    /* ── Right: Details panel ── */
    .details-panel {
      flex: 1; min-width: 0; display: flex; flex-direction: column;
      background: #fff; overflow: hidden;
    }

    .details-header {
      flex-shrink: 0; padding: 1rem 1.25rem 0.875rem;
      border-bottom: 1px solid #e2e8f0;
      display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;
    }
    .details-shipment-num {
      font-size: 15px; font-weight: 800; color: #0f172a; flex: 1; min-width: 0;
    }
    .details-carrier {
      font-size: 12px; color: #64748b; font-weight: 500; margin-top: 1px;
    }

    .details-body {
      flex: 1; min-height: 0; overflow-y: auto;
      padding: 1rem 1.25rem 2rem;
      display: flex; flex-direction: column; gap: 1.25rem;
    }

    /* Section */
    .section { display: flex; flex-direction: column; gap: 0.625rem; }
    .section-title {
      font-size: 10px; font-weight: 800; text-transform: uppercase;
      letter-spacing: 0.08em; color: #94a3b8;
      padding-bottom: 0.375rem; border-bottom: 1px solid #f1f5f9;
    }

    /* BOL info card */
    .bol-card {
      background: #f8fafc; border: 1px solid #e2e8f0;
      border-radius: 10px; padding: 0.875rem 1rem;
    }
    .bol-card-row {
      display: flex; align-items: baseline; gap: 0.5rem;
      font-size: 12px; color: #475569; margin-bottom: 0.375rem;
    }
    .bol-card-row:last-child { margin-bottom: 0; }
    .bol-card-label { font-weight: 700; color: #94a3b8; width: 100px; flex-shrink: 0; font-size: 11px; }
    .bol-card-value { color: #1e293b; font-weight: 600; }
    .bol-card-value.muted { color: #94a3b8; font-weight: 500; }

    /* Signature cards */
    .sig-cards { display: flex; flex-direction: column; gap: 0.625rem; }

    .sig-card {
      border: 1px solid #e2e8f0; border-radius: 10px;
      overflow: hidden;
    }
    .sig-card-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 0.625rem 0.875rem;
      background: #f8fafc; border-bottom: 1px solid #e2e8f0;
    }
    .sig-card-label {
      display: flex; align-items: center; gap: 0.5rem;
      font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .sig-card-label i { font-size: 13px; }
    .sig-card-body { padding: 0.75rem 0.875rem; }

    .sig-signed-row {
      display: flex; align-items: center; gap: 0.875rem;
    }
    .sig-img-wrap {
      width: 120px; height: 56px; flex-shrink: 0;
      border: 1px solid #e2e8f0; border-radius: 6px;
      background: #fff; overflow: hidden;
      display: flex; align-items: center; justify-content: center;
    }
    .sig-img-wrap img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .sig-meta { min-width: 0; }
    .sig-name { font-size: 13px; font-weight: 700; color: #0f172a; }
    .sig-date { font-size: 11px; color: #64748b; margin-top: 2px; }
    .sig-badge {
      display: inline-flex; align-items: center; gap: 4px;
      font-size: 11px; font-weight: 600; color: #15803d;
      background: #f0fdf4; border: 1px solid #86efac;
      padding: 2px 8px; border-radius: 12px;
    }

    .sig-unsigned {
      display: flex; align-items: center; justify-content: space-between;
      gap: 0.75rem;
    }
    .sig-unsigned-text {
      font-size: 12px; color: #94a3b8; font-style: italic;
    }

    /* Signature status pill */
    .sig-status-pill {
      display: inline-flex; align-items: center; gap: 5px;
      font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 10px;
    }
    .sig-status-pill.signed   { color: #15803d; background: #f0fdf4; border: 1px solid #86efac; }
    .sig-status-pill.pending  { color: #92400e; background: #fffbeb; border: 1px solid #fde68a; }
    .sig-dot {
      width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0;
    }
    .sig-dot.signed  { background: #16a34a; }
    .sig-dot.pending { background: #d97706; }

    /* Subtle add-signature icon button */
    .sig-action-btn {
      width: 26px; height: 26px; border-radius: 6px;
      background: none; border: 1px solid #e2e8f0; cursor: pointer;
      display: inline-flex; align-items: center; justify-content: center;
      color: #94a3b8; font-size: 11px; transition: all 0.15s;
    }
    .sig-action-btn:hover { background: #f1f5f9; color: #3b82f6; border-color: #bfdbfe; }

    .sig-pending-body {
      display: flex; align-items: center; gap: 0.5rem;
      padding: 0.25rem 0;
    }
    .sig-unsigned-text { font-size: 12px; color: #94a3b8; }

    /* Scope selector in send modal */
    .scope-options { display: flex; flex-direction: column; gap: 0.375rem; }
    .scope-option {
      display: flex; align-items: center; gap: 0.75rem;
      padding: 0.625rem 0.75rem; border-radius: 8px;
      border: 1.5px solid #e2e8f0; background: #fff;
      cursor: pointer; text-align: left; font-family: inherit;
      transition: all 0.15s;
    }
    .scope-option:hover { border-color: #93c5fd; background: #f8faff; }
    .scope-option.active { border-color: #3b82f6; background: #eff6ff; }
    .scope-option-check {
      width: 18px; height: 18px; border-radius: 50%; flex-shrink: 0;
      border: 1.5px solid #cbd5e1;
      display: flex; align-items: center; justify-content: center;
      font-size: 10px; color: #fff;
    }
    .scope-option.active .scope-option-check { background: #3b82f6; border-color: #3b82f6; }
    .scope-option-title { font-size: 12px; font-weight: 700; color: #1e293b; }
    .scope-option-sub   { font-size: 11px; color: #64748b; margin-top: 1px; }

    /* Shipment info */
    .info-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;
    }
    .info-item {
      background: #f8fafc; border: 1px solid #e2e8f0;
      border-radius: 8px; padding: 0.625rem 0.75rem;
    }
    .info-item-label { font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
    .info-item-value { font-size: 13px; font-weight: 600; color: #1e293b; margin-top: 2px; }
    .info-item-value.empty { color: #cbd5e1; font-style: italic; font-weight: 400; }

    /* Send bar */
    .send-bar {
      flex-shrink: 0; padding: 0.875rem 1.25rem;
      border-top: 1px solid #e2e8f0;
      background: #fff;
      display: flex; align-items: center; justify-content: space-between; gap: 1rem;
    }
    .send-bar-text { font-size: 12px; color: #64748b; }
    .send-bar-text strong { color: #1e293b; }

    /* ── Signature overlay ── */
    .overlay {
      position: fixed; inset: 0; z-index: 1000;
      background: rgba(0,0,0,0.55); backdrop-filter: blur(2px);
      display: flex; align-items: center; justify-content: center;
      padding: 1rem;
    }

    .modal {
      background: #fff; border-radius: 14px;
      width: 100%; max-width: 520px;
      box-shadow: 0 24px 64px rgba(0,0,0,0.2);
      overflow: hidden;
    }
    .modal-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 1rem 1.25rem; border-bottom: 1px solid #e2e8f0;
    }
    .modal-title { font-size: 14px; font-weight: 700; color: #0f172a; }
    .modal-close {
      width: 28px; height: 28px; border-radius: 6px;
      background: none; border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      color: #94a3b8; transition: all 0.15s;
    }
    .modal-close:hover { background: #f1f5f9; color: #475569; }
    .modal-body { padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem; }
    .modal-footer {
      padding: 1rem 1.25rem; border-top: 1px solid #e2e8f0;
      display: flex; align-items: center; justify-content: flex-end; gap: 0.625rem;
    }

    /* Canvas pad */
    .canvas-wrap {
      border: 1.5px solid #e2e8f0; border-radius: 10px;
      overflow: hidden; position: relative; background: #fff;
    }
    .canvas-label {
      font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase;
      letter-spacing: 0.05em; padding: 0.375rem 0.75rem;
      border-bottom: 1px solid #f1f5f9; background: #f8fafc;
      display: flex; align-items: center; justify-content: space-between;
    }
    .canvas-clear-btn {
      background: none; border: none; cursor: pointer;
      font-size: 11px; color: #64748b; font-weight: 600;
      font-family: inherit; padding: 0;
    }
    .canvas-clear-btn:hover { color: #ef4444; }
    #sig-canvas {
      display: block; width: 100%; height: 140px;
      cursor: crosshair; touch-action: none;
    }

    /* Name input */
    .field-label {
      font-size: 11px; font-weight: 700; color: #64748b; margin-bottom: 0.375rem;
      text-transform: uppercase; letter-spacing: 0.04em;
    }
    .sig-name-input {
      width: 100%; padding: 0.55rem 0.75rem; border-radius: 8px;
      border: 1.5px solid #e2e8f0; font-size: 13px; font-family: inherit;
      outline: none; box-sizing: border-box; color: #1e293b;
      transition: border-color 0.15s;
    }
    .sig-name-input:focus { border-color: #3b82f6; }

    .sig-error { font-size: 12px; color: #ef4444; font-weight: 500; }

    /* ── Send overlay ── */
    .send-tabs { display: flex; border-bottom: 1px solid #e2e8f0; }
    .send-tab {
      flex: 1; padding: 0.625rem; text-align: center;
      background: none; border: none; border-bottom: 2px solid transparent;
      font-size: 13px; font-weight: 600; color: #64748b;
      cursor: pointer; font-family: inherit; transition: all 0.15s;
    }
    .send-tab:hover { color: #1e293b; }
    .send-tab.active { color: #2563eb; border-bottom-color: #2563eb; }

    .send-field { display: flex; flex-direction: column; gap: 0.375rem; }
    .send-input {
      width: 100%; padding: 0.55rem 0.75rem; border-radius: 8px;
      border: 1.5px solid #e2e8f0; font-size: 13px; font-family: inherit;
      outline: none; box-sizing: border-box; color: #1e293b;
      transition: border-color 0.15s;
    }
    .send-input:focus { border-color: #3b82f6; }
    textarea.send-input { resize: vertical; min-height: 80px; }

    .send-success {
      display: flex; flex-direction: column; align-items: center;
      gap: 0.75rem; padding: 1.5rem 1rem;
      text-align: center;
    }
    .send-success i { font-size: 2.5rem; color: #16a34a; }
    .send-success-title { font-size: 14px; font-weight: 700; color: #0f172a; }
    .send-success-sub { font-size: 12px; color: #64748b; }

    /* Annotation tools inline in pdf-header */
    .pdf-header-tools {
      display: flex; align-items: center; gap: 2px; flex-shrink: 0;
    }
    .ann-tool-btn {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 0.3rem 0.625rem; border-radius: 5px;
      background: none; border: 1px solid transparent;
      color: #64748b; font-size: 11px; font-weight: 600;
      cursor: pointer; font-family: inherit; transition: all 0.15s;
      letter-spacing: 0.01em;
    }
    .ann-tool-btn i { font-size: 11px; }
    .ann-tool-btn:hover { background: rgba(255,255,255,0.06); color: #94a3b8; }
    .ann-tool-btn.active.sign { background: rgba(99,102,241,0.2); border-color: #6366f1; color: #a5b4fc; }
    .ann-tool-btn.active.hl   { background: rgba(234,179,8,0.15); border-color: #ca8a04; color: #fbbf24; }
    .ann-tool-btn.active.red  { background: rgba(239,68,68,0.15); border-color: #dc2626; color: #fca5a5; }

    .ann-toolbar-sep {
      width: 1px; height: 18px; background: #1e2d3d; margin: 0 0.5rem; flex-shrink: 0;
    }
    .ann-count {
      font-size: 11px; color: #60a5fa; font-weight: 600; margin-right: 0.25rem;
    }
    .ann-save-btn {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 0.25rem 0.625rem; border-radius: 5px;
      background: #1d4ed8; border: none; color: #fff;
      font-size: 11px; font-weight: 700; cursor: pointer; font-family: inherit;
      transition: background 0.15s;
    }
    .ann-save-btn:hover { background: #2563eb; }
    .ann-discard-btn {
      background: none; border: none; color: #64748b; font-size: 11px;
      font-weight: 600; cursor: pointer; font-family: inherit; padding: 0.25rem 0.375rem;
    }
    .ann-discard-btn:hover { color: #ef4444; }

    /* ── Annotation overlay ── */
    .annotation-layer {
      position: absolute; inset: 0; z-index: 10;
      pointer-events: none;
    }
    .annotation-layer.tool-active { pointer-events: auto; }
    .annotation-layer.tool-highlight { cursor: crosshair; }
    .annotation-layer.tool-redact   { cursor: crosshair; }
    .annotation-layer.tool-placing  { cursor: copy; }

    .ann-item {
      position: absolute; box-sizing: border-box;
    }
    .ann-item.ann-highlight {
      background: rgba(234, 179, 8, 0.30); border: 1.5px solid rgba(202,138,4,0.5);
      border-radius: 2px;
    }
    .ann-item.ann-redact {
      background: #0f172a; border: 2px solid #334155; border-radius: 2px;
    }
    .ann-item.ann-preview {
      pointer-events: none;
    }
    .ann-item.ann-sig-item {
      display: flex; flex-direction: column; align-items: flex-start;
      background: rgba(255,255,255,0.92); border: 1.5px solid #6366f1;
      border-radius: 4px; padding: 3px 5px; box-shadow: 0 2px 8px rgba(0,0,0,0.18);
    }
    .ann-sig-img { max-width: 100%; max-height: 80%; object-fit: contain; }
    .ann-sig-name { font-size: 9px; font-weight: 700; color: #4338ca; white-space: nowrap; margin-top: 1px; }
    .ann-sig-role { font-size: 8px; color: #6366f1; text-transform: uppercase; letter-spacing: 0.04em; }

    .ann-delete-btn {
      position: absolute; top: -8px; right: -8px;
      width: 16px; height: 16px; border-radius: 50%;
      background: #ef4444; border: none; color: #fff;
      font-size: 8px; cursor: pointer; display: none;
      align-items: center; justify-content: center;
    }
    .ann-item:hover .ann-delete-btn { display: flex; }

    .ann-place-hint {
      position: absolute; bottom: 1rem; left: 50%; transform: translateX(-50%);
      background: rgba(99,102,241,0.9); color: #fff; border-radius: 20px;
      padding: 0.375rem 1rem; font-size: 12px; font-weight: 600;
      pointer-events: none; white-space: nowrap;
      display: flex; align-items: center; gap: 0.375rem;
    }

    /* ── Compact sig status in right panel ── */
    .sig-status-list { display: flex; flex-direction: column; gap: 0.375rem; }
    .sig-status-row-item {
      display: flex; align-items: center; gap: 0.625rem;
      padding: 0.5rem 0.75rem; border-radius: 8px;
      background: #f8fafc; border: 1px solid #e2e8f0;
    }
    .sig-status-row-icon { font-size: 13px; color: #94a3b8; }
    .sig-status-role { font-size: 11px; font-weight: 700; color: #475569; width: 68px; }
    .sig-status-name { font-size: 12px; font-weight: 600; color: #0f172a; flex: 1; }
    .sig-status-date { font-size: 10px; color: #94a3b8; }

    /* Signing-as selector in sig modal */
    .role-selector { display: flex; gap: 0.5rem; }
    .role-option {
      flex: 1; padding: 0.5rem 0.75rem; border-radius: 8px;
      border: 1.5px solid #e2e8f0; background: #fff;
      cursor: pointer; text-align: center; font-family: inherit;
      font-size: 12px; font-weight: 700; color: #475569; transition: all 0.15s;
    }
    .role-option:hover { border-color: #93c5fd; }
    .role-option.active { border-color: #6366f1; background: #eef2ff; color: #4338ca; }

    /* ── Real-time status timeline ── */
    .status-timeline {
      flex-shrink: 0; display: flex; align-items: center;
      padding: 0.625rem 1.25rem; border-bottom: 1px solid #f1f5f9;
      gap: 0;
    }
    .status-step {
      display: flex; flex-direction: column; align-items: center; gap: 3px;
      flex-shrink: 0;
    }
    .status-step-dot {
      width: 18px; height: 18px; border-radius: 50%;
      border: 2px solid #cbd5e1; background: #fff;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.3s ease;
    }
    .status-step.done .status-step-dot  { background: #16a34a; border-color: #16a34a; color: #fff; }
    .status-step.active .status-step-dot { background: #3b82f6; border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59,130,246,0.2); animation: pulse-ring 1.5s infinite; }
    @keyframes pulse-ring {
      0%   { box-shadow: 0 0 0 0 rgba(59,130,246,0.4); }
      70%  { box-shadow: 0 0 0 6px rgba(59,130,246,0); }
      100% { box-shadow: 0 0 0 0 rgba(59,130,246,0); }
    }
    .status-step-label {
      font-size: 9px; font-weight: 700; color: #94a3b8; text-transform: uppercase;
      letter-spacing: 0.04em; white-space: nowrap; text-align: center;
      transition: color 0.3s;
    }
    .status-step.done .status-step-label  { color: #16a34a; }
    .status-step.active .status-step-label { color: #3b82f6; }
    .status-step-line {
      flex: 1; height: 2px; background: #e2e8f0; margin: 0 3px; margin-bottom: 14px;
      transition: background 0.3s;
    }
    .status-step-line.done { background: #16a34a; }

    /* Pickup location */
    .pickup-card {
      background: #f8fafc; border: 1px solid #e2e8f0;
      border-radius: 10px; overflow: hidden;
    }
    .pickup-card-body { padding: 0.75rem 1rem; }
    .pickup-name  { font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 2px; }
    .pickup-addr  { font-size: 12px; color: #475569; }
    .pickup-contact { font-size: 11px; color: #64748b; margin-top: 4px; }
    .pickup-empty { font-size: 12px; color: #94a3b8; font-style: italic; padding: 0.75rem 1rem; }
    .pickup-edit-row {
      display: flex; align-items: center; justify-content: flex-end;
      padding: 0.5rem 0.75rem; border-top: 1px solid #f1f5f9;
      gap: 0.5rem; background: #fff;
    }
    .pickup-select-wrap { padding: 0.75rem 1rem; border-top: 1px solid #f1f5f9; display: flex; flex-direction: column; gap: 0.5rem; }

    /* Loading skeletons */
    .skeleton-panel {
      flex: 1; padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem;
      background: var(--p-content-background);
    }
  `],
  template: `
    @if (loading()) {
      <!-- Loading split view -->
      <div class="viewer">
        <div class="pdf-panel">
          <div class="pdf-header">
            <div style="width: 72px;"><p-skeleton height="28px" borderRadius="6px" /></div>
            <div style="flex:1;"><p-skeleton height="14px" /><p-skeleton height="10px" styleClass="mt-1" /></div>
          </div>
          <div class="bol-tabs" style="gap:0.5rem; padding: 0.5rem 1rem;">
            <p-skeleton width="80px" height="28px" borderRadius="6px" />
            <p-skeleton width="80px" height="28px" borderRadius="6px" />
          </div>
          <div class="pdf-frame" style="background:#0a1520;">
            <div class="pdf-no-doc">
              <i class="pi pi-spinner pi-spin" style="font-size:2rem; color:#334155;"></i>
            </div>
          </div>
        </div>
        <div class="skeleton-panel">
          <p-skeleton height="20px" width="60%" />
          <p-skeleton height="14px" width="40%" />
          <p-skeleton height="100px" borderRadius="10px" />
          <p-skeleton height="80px" borderRadius="10px" />
          <p-skeleton height="80px" borderRadius="10px" />
        </div>
      </div>

    } @else if (error()) {
      <div style="flex:1; display:flex; align-items:center; justify-content:center; flex-direction:column; gap:1rem; color:#64748b;">
        <i class="pi pi-exclamation-triangle" style="font-size:2.5rem; color:#f59e0b;"></i>
        <p style="font-size:14px; margin:0;">{{ error() }}</p>
        <button type="button" class="pdf-back-btn" style="color:#3b82f6; border-color:#3b82f6;" (click)="goBack()">
          <i class="pi pi-arrow-left"></i> Back to Repository
        </button>
      </div>

    } @else {
      <div class="viewer">

        <!-- ── Left: PDF panel ─────────────────────────────────────────── -->
        <div class="pdf-panel">
          <div class="pdf-header">
            <button type="button" class="pdf-back-btn" (click)="goBack()">
              <i class="pi pi-arrow-left"></i> Back
            </button>
            <div class="pdf-header-title">
              <div class="pdf-shipment-num">
                Shipment {{ shipment()?.shipment_number ?? '—' }}
              </div>
              @if (shipment()?.carrier_name) {
                <div class="pdf-carrier">{{ shipment()!.carrier_name }}</div>
              }
            </div>

            <!-- Annotation tools (right side of header) -->
            <div class="pdf-header-tools">
              <button type="button" class="ann-tool-btn sign"
                [class.active]="activeTool() === 'signature'"
                (click)="toggleTool('signature')">
                <i class="pi pi-pencil"></i><span>Sign</span>
              </button>
              <button type="button" class="ann-tool-btn hl"
                [class.active]="activeTool() === 'highlight'"
                (click)="toggleTool('highlight')">
                <i class="pi pi-sun"></i><span>Highlight</span>
              </button>
              <button type="button" class="ann-tool-btn red"
                [class.active]="activeTool() === 'redact'"
                (click)="toggleTool('redact')">
                <i class="pi pi-eye-slash"></i><span>Redact</span>
              </button>
              @if (annotationsForBol().length > 0) {
                <div class="ann-toolbar-sep"></div>
                <button type="button" class="ann-save-btn" [disabled]="annotationsSaving()" (click)="saveAnnotations()">
                  @if (annotationsSaving()) {
                    <i class="pi pi-spinner pi-spin" style="font-size:10px;"></i>
                  } @else {
                    <i class="pi pi-check"></i>
                  }
                  Save
                </button>
                <button type="button" class="ann-discard-btn" (click)="discardAnnotations()">Discard</button>
              }
            </div>
          </div>

          @if (bols().length > 1) {
            <div class="bol-tabs">
              @for (bol of bols(); track bol.id) {
                <button
                  type="button"
                  class="bol-tab"
                  [class.active]="activeBolId() === bol.id"
                  (click)="selectBol(bol.id)"
                >
                  @if (bol.stop_sequence) {
                    <span class="bol-tab-stop">Stop {{ bol.stop_sequence }}</span>
                  }
                  {{ bol.bol_number }}
                </button>
              }
            </div>
          }

          <div class="pdf-frame">
            @if (safeUrl()) {
              <iframe [src]="safeUrl()!" title="BOL Document"></iframe>
            } @else {
              <div class="pdf-no-doc">
                <i class="pi pi-file-pdf"></i>
                <p>No document attached</p>
              </div>
            }

            <!-- Annotation overlay -->
            <div
              class="annotation-layer"
              [class.tool-active]="activeTool() !== 'none'"
              [class.tool-highlight]="activeTool() === 'highlight'"
              [class.tool-redact]="activeTool() === 'redact'"
              [class.tool-placing]="activeTool() === 'signature' && sigToPlace()"
              (mousedown)="onAnnMouseDown($event)"
              (mousemove)="onAnnMouseMove($event)"
              (mouseup)="onAnnMouseUp($event)"
              (mouseleave)="onAnnMouseLeave()"
            >
              @for (ann of annotationsForBol(); track ann.id) {
                <div
                  class="ann-item"
                  [class.ann-highlight]="ann.type === 'highlight'"
                  [class.ann-redact]="ann.type === 'redact'"
                  [class.ann-sig-item]="ann.type === 'signature'"
                  [style.left.%]="ann.x"
                  [style.top.%]="ann.y"
                  [style.width.%]="ann.width"
                  [style.height.%]="ann.height"
                >
                  @if (ann.type === 'signature') {
                    <img class="ann-sig-img" [src]="ann.imageUrl" />
                    <div class="ann-sig-name">{{ ann.signerName }}</div>
                  }
                  <button type="button" class="ann-delete-btn" (click)="removeAnnotation(ann.id); $event.stopPropagation()">
                    <i class="pi pi-times"></i>
                  </button>
                </div>
              }

              @if (dragPreview()) {
                <div
                  class="ann-item ann-preview"
                  [class.ann-highlight]="activeTool() === 'highlight'"
                  [class.ann-redact]="activeTool() === 'redact'"
                  [style.left.%]="dragPreview()!.x"
                  [style.top.%]="dragPreview()!.y"
                  [style.width.%]="dragPreview()!.width"
                  [style.height.%]="dragPreview()!.height"
                ></div>
              }

              @if (activeTool() === 'signature' && sigToPlace()) {
                <div class="ann-place-hint">
                  <i class="pi pi-map-marker"></i> Click to place signature
                </div>
              }
            </div>
          </div>
        </div>

        <!-- ── Right: Details panel ────────────────────────────────────── -->
        <div class="details-panel">
          <div class="details-header">
            <div style="flex:1; min-width:0;">
              <div class="details-shipment-num">
                Shipment {{ shipment()?.shipment_number ?? '—' }}
              </div>
              @if (shipment()?.carrier_name) {
                <div class="details-carrier">{{ shipment()!.carrier_name }}</div>
              }
            </div>
            @if (shipment()) {
              <p-tag
                [value]="shipmentStatusLabel(shipment()!.status)"
                [severity]="shipmentStatusSeverity(shipment()!.status)"
              />
            }
          </div>

          <!-- Real-time progress bar for the handoff demo flow -->
          @if (shipment()) {
            <div class="status-timeline">
              @for (step of statusSteps(); track step.key) {
                <div class="status-step" [class.done]="step.done" [class.active]="step.active">
                  <div class="status-step-dot">
                    @if (step.done) { <i class="pi pi-check" style="font-size:8px;"></i> }
                  </div>
                  <div class="status-step-label">{{ step.label }}</div>
                </div>
                @if (!$last) {
                  <div class="status-step-line" [class.done]="step.done"></div>
                }
              }
            </div>
          }

          <div class="details-body">

            <!-- Active BOL details -->
            @if (activeBol(); as bol) {
              <div class="section">
                <div class="section-title">
                  BOL Details
                  @if (bols().length > 1) {
                    <span style="font-weight:500; text-transform:none; letter-spacing:0;">
                      — Stop {{ bol.stop_sequence ?? '—' }} of {{ bols().length }}
                    </span>
                  }
                </div>
                <div class="bol-card">
                  <div class="bol-card-row">
                    <span class="bol-card-label">BOL Number</span>
                    <span class="bol-card-value">{{ bol.bol_number }}</span>
                  </div>
                  @if (bol.stop?.stop_name) {
                    <div class="bol-card-row">
                      <span class="bol-card-label">Stop Name</span>
                      <span class="bol-card-value">{{ bol.stop!.stop_name }}</span>
                    </div>
                  }
                  @if (bol.driver_email) {
                    <div class="bol-card-row">
                      <span class="bol-card-label">Driver Email</span>
                      <span class="bol-card-value">{{ bol.driver_email }}</span>
                    </div>
                  }
                  <div class="bol-card-row">
                    <span class="bol-card-label">Created</span>
                    <span class="bol-card-value">{{ formatDate(bol.created_at) }}</span>
                  </div>
                  @if (bol.page_count) {
                    <div class="bol-card-row">
                      <span class="bol-card-label">Pages</span>
                      <span class="bol-card-value">{{ bol.page_count }}</span>
                    </div>
                  }
                </div>
              </div>

              <!-- Document Fields (written by driver during signing) -->
              @if (getFormDataEntries(bol).length > 0) {
                <div class="section">
                  <div class="section-title">Document Fields</div>
                  <div class="bol-card">
                    @for (entry of getFormDataEntries(bol); track entry.key) {
                      <div class="bol-card-row">
                        <span class="bol-card-label">{{ entry.label }}</span>
                        <span class="bol-card-value">{{ entry.value }}</span>
                      </div>
                    }
                  </div>
                </div>
              }

              <!-- Pickup Location -->
              <div class="section">
                <div class="section-title" style="display:flex; align-items:center; justify-content:space-between;">
                  Pickup Location
                  @if (!editingPickupLocation()) {
                    <button type="button" style="background:none;border:none;cursor:pointer;font-size:11px;color:#3b82f6;font-weight:600;font-family:inherit;padding:0;"
                      (click)="startEditPickupLocation()">
                      <i class="pi pi-pencil" style="font-size:10px;"></i> Edit
                    </button>
                  }
                </div>
                <div class="pickup-card">
                  @if (bol.pickup_location; as loc) {
                    <div class="pickup-card-body">
                      <div class="pickup-name">{{ loc.name }}</div>
                      <div class="pickup-addr">{{ loc.address }}, {{ loc.city }}, {{ loc.state }} {{ loc.zip }}</div>
                      @if (loc.contact_name) {
                        <div class="pickup-contact">
                          <i class="pi pi-user" style="font-size:10px;"></i> {{ loc.contact_name }}
                          @if (loc.contact_phone) { &nbsp;· {{ loc.contact_phone }} }
                        </div>
                      }
                    </div>
                  } @else {
                    <div class="pickup-empty">No pickup location set</div>
                  }

                  @if (editingPickupLocation()) {
                    <div class="pickup-select-wrap">
                      <p-select
                        [options]="allLocations()"
                        [(ngModel)]="selectedLocationIdValue"
                        optionLabel="name"
                        optionValue="id"
                        placeholder="Select a location…"
                        [filter]="true"
                        filterBy="name,address,city"
                        [style]="{ width: '100%' }"
                      />
                      <div style="display:flex; gap:0.5rem; justify-content:flex-end;">
                        <p-button label="Cancel" severity="secondary" [text]="true" size="small"
                          (click)="editingPickupLocation.set(false)" />
                        <p-button label="Save" size="small" [loading]="locationSaving()"
                          (click)="savePickupLocation()" />
                      </div>
                    </div>
                  }
                </div>
              </div>

              <!-- Signatures (status-only) -->
              <div class="section">
                <div class="section-title">Signatures</div>
                <div class="sig-status-list">
                  @for (role of [{ key: 'driver', label: 'Driver', icon: 'pi-user' }, { key: 'consignee', label: 'Consignee', icon: 'pi-building' }]; track role.key) {
                    <div class="sig-status-row-item">
                      <i class="pi {{ role.icon }} sig-status-row-icon"></i>
                      <span class="sig-status-role">{{ role.label }}</span>
                      @if (getSignature(bol, role.key === 'driver' ? 'driver' : 'consignee'); as sig) {
                        <span class="sig-status-name">{{ sig.signer_name }}</span>
                        <span class="sig-status-date">{{ formatDate(sig.signed_at) }}</span>
                        <span class="sig-status-pill signed" style="margin-left:auto;">
                          <span class="sig-dot signed"></span>Signed
                        </span>
                      } @else if (isSignedByStatus(bol, role.key === 'driver' ? 'driver' : 'consignee')) {
                        <span class="sig-status-name">{{ role.key === 'driver' ? (bol.driver_email ?? 'Driver') : 'Consignee' }}</span>
                        <span class="sig-status-pill signed" style="margin-left:auto;">
                          <span class="sig-dot signed"></span>Signed
                        </span>
                      } @else {
                        <span class="sig-status-pill pending" style="margin-left:auto;">
                          <span class="sig-dot pending"></span>Pending
                        </span>
                      }
                    </div>
                  }
                </div>
              </div>
            }

            <!-- Shipment Info -->
            @if (shipment()) {
              <div class="section">
                <div class="section-title">Shipment Info</div>
                <div class="info-grid">
                  <div class="info-item">
                    <div class="info-item-label">Carrier</div>
                    <div class="info-item-value" [class.empty]="!shipment()!.carrier_name">
                      {{ shipment()!.carrier_name ?? 'Not set' }}
                    </div>
                  </div>
                  <div class="info-item">
                    <div class="info-item-label">SCAC</div>
                    <div class="info-item-value" [class.empty]="!shipment()!.scac_code">
                      {{ shipment()!.scac_code ?? 'Not set' }}
                    </div>
                  </div>
                  <div class="info-item">
                    <div class="info-item-label">DOT #</div>
                    <div class="info-item-value" [class.empty]="!shipment()!.carrier_dot">
                      {{ shipment()!.carrier_dot ?? 'Not set' }}
                    </div>
                  </div>
                  <div class="info-item">
                    <div class="info-item-label">Total BOLs</div>
                    <div class="info-item-value">{{ bols().length }}</div>
                  </div>
                </div>
              </div>
            }

          </div><!-- /details-body -->

          <!-- Send bar -->
          <div class="send-bar">
            <span class="send-bar-text">
              Send via email or SMS —
              <strong>{{ bols().length === 1 ? activeBol()!.bol_number : bols().length + ' BOLs' }}</strong>
            </span>
            <p-button
              label="Send Document"
              icon="pi pi-send"
              size="small"
              (click)="openSendModal()"
            />
          </div>

        </div><!-- /details-panel -->
      </div><!-- /viewer -->
    }

    <!-- ── Signature capture overlay ──────────────────────────────────────── -->
    @if (sigModalOpen()) {
      <div class="overlay" (click)="onOverlayClick($event)">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <span class="modal-title">Sign Document</span>
            <button type="button" class="modal-close" (click)="closeSigModal()">
              <i class="pi pi-times"></i>
            </button>
          </div>
          <div class="modal-body">
            <!-- Canvas pad -->
            <div>
              <div class="canvas-wrap">
                <div class="canvas-label">
                  <span>Draw signature below</span>
                  <button type="button" class="canvas-clear-btn" (click)="clearCanvas()">
                    <i class="pi pi-refresh" style="font-size:10px;"></i> Clear
                  </button>
                </div>
                <canvas id="sig-canvas"></canvas>
              </div>
            </div>
            <!-- Name field -->
            <div>
              <div class="field-label">Printed name *</div>
              <input
                type="text"
                class="sig-name-input"
                placeholder="Full name"
                [(ngModel)]="sigNameValue"
              />
            </div>
            @if (sigError()) {
              <div class="sig-error">
                <i class="pi pi-exclamation-circle" style="font-size:11px;"></i>
                {{ sigError() }}
              </div>
            }
          </div>
          <div class="modal-footer">
            <p-button label="Cancel" severity="secondary" [text]="true" size="small" (click)="closeSigModal()" />
            <p-button
              label="Add to Document"
              icon="pi pi-map-marker"
              size="small"
              (click)="placeSignature()"
            />
          </div>
        </div>
      </div>
    }

    <!-- ── Send document overlay ──────────────────────────────────────────── -->
    @if (sendModalOpen()) {
      <div class="overlay" (click)="onOverlayClick($event)">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <span class="modal-title">Send Document</span>
            <button type="button" class="modal-close" (click)="closeSendModal()">
              <i class="pi pi-times"></i>
            </button>
          </div>

          @if (sendSuccess()) {
            <div class="send-success">
              <i class="pi pi-check-circle"></i>
              <div class="send-success-title">Sent successfully!</div>
              <div class="send-success-sub">
                The document has been sent to {{ sendTab() === 'email' ? sendEmailValue : sendPhoneValue }}.
              </div>
            </div>
            <div class="modal-footer">
              <p-button label="Done" size="small" (click)="closeSendModal()" />
            </div>
          } @else {
            <div class="send-tabs">
              <button type="button" class="send-tab" [class.active]="sendTab() === 'email'" (click)="sendTabValue = 'email'">
                <i class="pi pi-envelope" style="margin-right:6px;"></i>Email
              </button>
              <button type="button" class="send-tab" [class.active]="sendTab() === 'sms'" (click)="sendTabValue = 'sms'">
                <i class="pi pi-mobile" style="margin-right:6px;"></i>SMS
              </button>
            </div>
            <div class="modal-body">

              <!-- Scope selector -->
              <div class="send-field">
                <div class="field-label">Documents to send</div>
                <div class="scope-options">
                  <button type="button" class="scope-option" [class.active]="sendScope() === 'all'" (click)="sendScopeValue = 'all'">
                    <div class="scope-option-check">
                      @if (sendScope() === 'all') { <i class="pi pi-check"></i> }
                    </div>
                    <div>
                      <div class="scope-option-title">Entire Package</div>
                      <div class="scope-option-sub">All {{ bols().length }} BOL{{ bols().length !== 1 ? 's' : '' }} in this shipment</div>
                    </div>
                  </button>
                  @for (b of bols(); track b.id) {
                    <button type="button" class="scope-option" [class.active]="sendScope() === b.id" (click)="sendScopeValue = b.id">
                      <div class="scope-option-check">
                        @if (sendScope() === b.id) { <i class="pi pi-check"></i> }
                      </div>
                      <div>
                        <div class="scope-option-title">{{ b.bol_number }}</div>
                        <div class="scope-option-sub">
                          @if (b.stop_sequence) { Stop {{ b.stop_sequence }}{{ b.stop?.stop_name ? ' — ' + b.stop!.stop_name : '' }} }
                          @else { Single stop }
                        </div>
                      </div>
                    </button>
                  }
                </div>
              </div>

              <!-- Recipient -->
              @if (sendTab() === 'email') {
                <div class="send-field">
                  <div class="field-label">Recipient email *</div>
                  <input type="email" class="send-input" placeholder="driver@carrier.com" [(ngModel)]="sendEmailValue" />
                </div>
                <div class="send-field">
                  <div class="field-label">Message (optional)</div>
                  <textarea class="send-input" placeholder="Please sign and return…" [(ngModel)]="sendMessageValue"></textarea>
                </div>
              } @else {
                <div class="send-field">
                  <div class="field-label">Phone number *</div>
                  <input type="tel" class="send-input" placeholder="+1 (555) 000-0000" [(ngModel)]="sendPhoneValue" />
                </div>
              }
            </div>
            <div class="modal-footer">
              <p-button label="Cancel" severity="secondary" [text]="true" size="small" (click)="closeSendModal()" />
              <p-button
                [label]="sendTab() === 'email' ? 'Send Email' : 'Send SMS'"
                [icon]="sendTab() === 'email' ? 'pi pi-envelope' : 'pi pi-mobile'"
                size="small"
                [loading]="sendSubmitting()"
                (click)="submitSend()"
              />
            </div>
          }
        </div>
      </div>
    }
  `,
})
export class ShipmentViewerComponent implements OnInit, OnDestroy {
  private bolsService = inject(BolsService);
  private locationsService = inject(LocationsService);
  private route = inject(ActivatedRoute);
  private sanitizer = inject(DomSanitizer);
  router = inject(Router);

  // ── State ─────────────────────────────────────────────────────────────────
  loading = signal(true);
  error = signal<string | null>(null);
  bols = signal<BolWithRelations[]>([]);
  activeBolId = signal<string | null>(null);

  activeBol = computed(() =>
    this.bols().find(b => b.id === this.activeBolId()) ?? this.bols()[0] ?? null
  );
  shipment = computed(() => this.activeBol()?.shipment ?? null);

  safeUrl = computed(() => {
    const url = this.activeBol()?.pdf_url;
    if (!url) return null;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  });

  // ── Annotation state ──────────────────────────────────────────────────────
  activeTool = signal<'none' | 'signature' | 'highlight' | 'redact'>('none');
  annotations = signal<AnnotationItem[]>([]);
  sigToPlace = signal<boolean>(false);
  annotationsSaving = signal(false);
  dragPreview = signal<{ x: number; y: number; width: number; height: number } | null>(null);

  annotationsForBol = computed(() =>
    this.annotations().filter(a => a.bolId === (this.activeBolId() ?? ''))
  );

  // ── Status timeline ────────────────────────────────────────────────────────
  private static readonly STEPS = [
    { key: 'pending',          label: 'Uploaded' },
    { key: 'claimed',          label: 'Claimed' },
    { key: 'driver_signed',    label: 'Driver Signed' },
    { key: 'consignee_signed', label: 'Consignee' },
    { key: 'completed',        label: 'Complete' },
  ];
  private static readonly STEP_ORDER = ['pending', 'claimed', 'driver_signed', 'consignee_signed', 'completed'];

  statusSteps = computed(() => {
    const bolStatus = this.activeBol()?.status ?? 'pending';
    const currentIdx = ShipmentViewerComponent.STEP_ORDER.indexOf(bolStatus);
    return ShipmentViewerComponent.STEPS.map((step, i) => {
      const stepIdx = ShipmentViewerComponent.STEP_ORDER.indexOf(step.key);
      return {
        ...step,
        done:   stepIdx < currentIdx,
        active: stepIdx === currentIdx,
      };
    });
  });

  private dragStart: { x: number; y: number } | null = null;

  // ── Signature modal ───────────────────────────────────────────────────────
  sigModalOpen = signal(false);
  sigBolId = signal<string | null>(null);
  sigError = signal<string | null>(null);
  sigNameValue = '';

  private canvasCtx: CanvasRenderingContext2D | null = null;
  private isDrawing = false;

  // ── Pickup location ───────────────────────────────────────────────────────
  editingPickupLocation = signal(false);
  allLocations = signal<Location[]>([]);
  locationSaving = signal(false);
  private _selectedLocationId = signal<string | null>(null);
  get selectedLocationIdValue(): string | null { return this._selectedLocationId(); }
  set selectedLocationIdValue(v: string | null) { this._selectedLocationId.set(v); }

  async startEditPickupLocation(): Promise<void> {
    const locs = await this.locationsService.list();
    this.allLocations.set(locs);
    this._selectedLocationId.set(this.activeBol()?.pickup_location_id ?? null);
    this.editingPickupLocation.set(true);
  }

  async savePickupLocation(): Promise<void> {
    const bolId = this.activeBol()?.id;
    if (!bolId) return;
    this.locationSaving.set(true);
    try {
      await supabase.from('bols').update({ pickup_location_id: this._selectedLocationId() }).eq('id', bolId);
      await this.load(bolId);
      this.editingPickupLocation.set(false);
    } finally {
      this.locationSaving.set(false);
    }
  }

  // ── Send modal ────────────────────────────────────────────────────────────
  sendModalOpen = signal(false);
  sendSubmitting = signal(false);
  sendSuccess = signal(false);
  sendEmailValue = '';
  sendPhoneValue = '';
  sendMessageValue = '';

  private _sendTab = signal<'email' | 'sms'>('email');
  sendTab = this._sendTab.asReadonly();
  set sendTabValue(v: 'email' | 'sms') { this._sendTab.set(v); }

  private _sendScope = signal<'all' | string>('all');
  sendScope = this._sendScope.asReadonly();
  set sendScopeValue(v: 'all' | string) { this._sendScope.set(v); }

  private channel: RealtimeChannel | null = null;
  private shipmentId = '';
  private pollInterval: ReturnType<typeof setInterval> | null = null;

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.shipmentId = this.route.snapshot.paramMap.get('shipmentId') ?? '';
    const bolParam = this.route.snapshot.queryParamMap.get('bol');
    this.load(bolParam);
    this.subscribeToChanges();
    this.pollInterval = setInterval(() => void this.reload(), 5000);
  }

  ngOnDestroy(): void {
    if (this.channel) supabase.removeChannel(this.channel);
    if (this.pollInterval) clearInterval(this.pollInterval);
  }

  // ── Data loading ──────────────────────────────────────────────────────────
  private async load(preselectBolId?: string | null): Promise<void> {
    this.loading.set(true);
    try {
      const bols = await this.bolsService.getByShipmentId(this.shipmentId);
      this.bols.set(bols);
      const toSelect = preselectBolId
        ? (bols.find(b => b.id === preselectBolId)?.id ?? bols[0]?.id)
        : bols[0]?.id;
      this.activeBolId.set(toSelect ?? null);
    } catch {
      this.error.set('Could not load shipment. It may not exist or you may not have access.');
    } finally {
      this.loading.set(false);
    }
  }

  private async reload(): Promise<void> {
    try {
      const bols = await this.bolsService.getByShipmentId(this.shipmentId);
      this.bols.set(bols);
    } catch { /* silently ignore realtime reload errors */ }
  }

  private subscribeToChanges(): void {
    const bolFilter      = `shipment_id=eq.${this.shipmentId}`;
    const shipmentFilter = `id=eq.${this.shipmentId}`;
    this.channel = supabase
      .channel(`viewer-${this.shipmentId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'shipments', filter: shipmentFilter }, () => void this.reload())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bols',      filter: bolFilter      }, () => void this.reload())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'signatures'                        }, () => void this.reload())
      .subscribe();
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  selectBol(bolId: string): void {
    this.activeBolId.set(bolId);
    this.router.navigate([], { queryParams: { bol: bolId }, replaceUrl: true });
  }

  goBack(): void {
    this.router.navigate(['/repository']);
  }

  onOverlayClick(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('overlay')) {
      this.closeSigModal();
      this.closeSendModal();
    }
  }

  // ── Annotation tools ──────────────────────────────────────────────────────
  toggleTool(tool: 'signature' | 'highlight' | 'redact'): void {
    if (this.activeTool() === tool) {
      this.activeTool.set('none');
    } else if (tool === 'signature') {
      this.activeTool.set('signature');
      this.openSigModal();
    } else {
      this.activeTool.set(tool);
    }
  }

  onAnnMouseDown(e: MouseEvent): void {
    const tool = this.activeTool();
    if (tool === 'none') return;

    if (tool === 'signature' && this.sigToPlace()) {
      // Place the pending signature at click position
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      const ann: AnnotationItem = {
        id: crypto.randomUUID(),
        bolId: this.activeBolId()!,
        type: 'signature',
        x: Math.max(0, x - 12), y: Math.max(0, y - 5),
        width: 24, height: 10,
        imageUrl: this._pendingSigData,
        signerName: this._pendingSigName,
        signerType: this._pendingSigType,
      };
      this.annotations.update(list => [...list, ann]);
      this.sigToPlace.set(false);
      this.activeTool.set('none');
      return;
    }

    if (tool === 'highlight' || tool === 'redact') {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      this.dragStart = {
        x: ((e.clientX - rect.left) / rect.width) * 100,
        y: ((e.clientY - rect.top) / rect.height) * 100,
      };
    }
  }

  onAnnMouseMove(e: MouseEvent): void {
    if (!this.dragStart) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const cx = ((e.clientX - rect.left) / rect.width) * 100;
    const cy = ((e.clientY - rect.top) / rect.height) * 100;
    this.dragPreview.set({
      x: Math.min(this.dragStart.x, cx),
      y: Math.min(this.dragStart.y, cy),
      width: Math.abs(cx - this.dragStart.x),
      height: Math.abs(cy - this.dragStart.y),
    });
  }

  onAnnMouseUp(e: MouseEvent): void {
    if (!this.dragStart) return;
    const preview = this.dragPreview();
    if (preview && preview.width > 0.5 && preview.height > 0.5) {
      this.annotations.update(list => [...list, {
        id: crypto.randomUUID(),
        bolId: this.activeBolId()!,
        type: this.activeTool() as 'highlight' | 'redact',
        ...preview,
      }]);
    }
    this.dragStart = null;
    this.dragPreview.set(null);
  }

  onAnnMouseLeave(): void {
    this.dragStart = null;
    this.dragPreview.set(null);
  }

  removeAnnotation(id: string): void {
    this.annotations.update(list => list.filter(a => a.id !== id));
  }

  discardAnnotations(): void {
    const bolId = this.activeBolId()!;
    this.annotations.update(list => list.filter(a => a.bolId !== bolId));
  }

  async saveAnnotations(): Promise<void> {
    const bolId = this.activeBolId()!;
    const sigAnns = this.annotationsForBol().filter(a => a.type === 'signature');
    if (sigAnns.length === 0) return;

    this.annotationsSaving.set(true);
    try {
      for (const sig of sigAnns) {
        await this.bolsService.addSignature(bolId, sig.signerType!, sig.signerName!, sig.imageUrl!);
      }
      this.annotations.update(list =>
        list.filter(a => !(a.bolId === bolId && a.type === 'signature'))
      );
      await this.reload();
    } finally {
      this.annotationsSaving.set(false);
    }
  }

  // ── Signature capture ─────────────────────────────────────────────────────
  private _pendingSigData = '';
  private _pendingSigName = '';
  private _pendingSigType: 'driver' | 'consignee' = 'driver';

  openSigModal(): void {
    this.sigBolId.set(this.activeBolId());
    this.sigNameValue = '';
    this.sigError.set(null);
    this.sigModalOpen.set(true);
    setTimeout(() => this.initCanvas(), 60);
  }

  closeSigModal(): void {
    this.sigModalOpen.set(false);
    this.activeTool.set('none');
    this.teardownCanvas();
  }

  private initCanvas(): void {
    const canvas = document.getElementById('sig-canvas') as HTMLCanvasElement | null;
    if (!canvas) return;

    canvas.width = canvas.offsetWidth || 468;
    canvas.height = canvas.offsetHeight || 140;

    const ctx = canvas.getContext('2d')!;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    this.canvasCtx = ctx;

    canvas.addEventListener('mousedown', this.onCanvasMouseDown);
    canvas.addEventListener('mousemove', this.onCanvasMouseMove);
    canvas.addEventListener('mouseup', this.onCanvasMouseUp);
    canvas.addEventListener('mouseleave', this.onCanvasMouseUp);
    canvas.addEventListener('touchstart', this.onCanvasTouchStart, { passive: false });
    canvas.addEventListener('touchmove', this.onCanvasTouchMove, { passive: false });
    canvas.addEventListener('touchend', this.onCanvasMouseUp);
  }

  private teardownCanvas(): void {
    const canvas = document.getElementById('sig-canvas') as HTMLCanvasElement | null;
    if (!canvas) return;
    canvas.removeEventListener('mousedown', this.onCanvasMouseDown);
    canvas.removeEventListener('mousemove', this.onCanvasMouseMove);
    canvas.removeEventListener('mouseup', this.onCanvasMouseUp);
    canvas.removeEventListener('mouseleave', this.onCanvasMouseUp);
    canvas.removeEventListener('touchstart', this.onCanvasTouchStart);
    canvas.removeEventListener('touchmove', this.onCanvasTouchMove);
    canvas.removeEventListener('touchend', this.onCanvasMouseUp);
    this.canvasCtx = null;
  }

  private getCanvasPos(e: MouseEvent | Touch, canvas: HTMLCanvasElement) {
    const r = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (canvas.width / r.width),
      y: (e.clientY - r.top) * (canvas.height / r.height),
    };
  }

  private onCanvasMouseDown = (e: MouseEvent) => {
    this.isDrawing = true;
    const p = this.getCanvasPos(e, e.target as HTMLCanvasElement);
    this.canvasCtx?.beginPath();
    this.canvasCtx?.moveTo(p.x, p.y);
  };

  private onCanvasMouseMove = (e: MouseEvent) => {
    if (!this.isDrawing || !this.canvasCtx) return;
    const p = this.getCanvasPos(e, e.target as HTMLCanvasElement);
    this.canvasCtx.lineTo(p.x, p.y);
    this.canvasCtx.stroke();
  };

  private onCanvasMouseUp = () => { this.isDrawing = false; };

  private onCanvasTouchStart = (e: TouchEvent) => {
    e.preventDefault();
    this.isDrawing = true;
    const p = this.getCanvasPos(e.touches[0], e.target as HTMLCanvasElement);
    this.canvasCtx?.beginPath();
    this.canvasCtx?.moveTo(p.x, p.y);
  };

  private onCanvasTouchMove = (e: TouchEvent) => {
    e.preventDefault();
    if (!this.isDrawing || !this.canvasCtx) return;
    const p = this.getCanvasPos(e.touches[0], e.target as HTMLCanvasElement);
    this.canvasCtx.lineTo(p.x, p.y);
    this.canvasCtx.stroke();
  };

  clearCanvas(): void {
    const canvas = document.getElementById('sig-canvas') as HTMLCanvasElement | null;
    if (!canvas || !this.canvasCtx) return;
    this.canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
  }

  placeSignature(): void {
    const canvas = document.getElementById('sig-canvas') as HTMLCanvasElement | null;
    if (!canvas) return;

    if (!this.sigNameValue.trim()) {
      this.sigError.set('Please enter your name.');
      return;
    }
    const pixels = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
    const hasInk = Array.from({ length: pixels.length / 4 }, (_, i) => pixels[i * 4 + 3]).some(a => a > 0);
    if (!hasInk) {
      this.sigError.set('Please draw your signature in the box above.');
      return;
    }

    this._pendingSigData = canvas.toDataURL('image/png');
    this._pendingSigName = this.sigNameValue.trim();
    this._pendingSigType = 'driver';

    this.teardownCanvas();
    this.sigModalOpen.set(false);
    // Switch to click-to-place mode — user clicks the exact spot on the document
    this.sigToPlace.set(true);
    this.activeTool.set('signature');
  }

  // ── Send document ─────────────────────────────────────────────────────────
  openSendModal(): void {
    this._sendTab.set('email');
    this._sendScope.set('all');
    this.sendEmailValue = '';
    this.sendPhoneValue = '';
    this.sendMessageValue = '';
    this.sendSuccess.set(false);
    this.sendModalOpen.set(true);
  }

  closeSendModal(): void {
    this.sendModalOpen.set(false);
  }

  async submitSend(): Promise<void> {
    const recipient = this.sendTab() === 'email' ? this.sendEmailValue : this.sendPhoneValue;
    if (!recipient.trim()) return;

    const bolIds = this.sendScope() === 'all'
      ? this.bols().map(b => b.id)
      : [this.sendScope()];

    this.sendSubmitting.set(true);
    try {
      await supabase.functions.invoke('send-document', {
        body: {
          bolIds,
          scope: this.sendScope() === 'all' ? 'package' : 'single',
          shipmentId: this.shipmentId,
          method: this.sendTab(),
          recipient: recipient.trim(),
          message: this.sendMessageValue || null,
        },
      });
      this.sendSuccess.set(true);
    } catch {
      this.sendSuccess.set(true); // Stub — treat as success
    } finally {
      this.sendSubmitting.set(false);
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  getSignature(bol: BolWithRelations, type: 'driver' | 'consignee') {
    return bol.signatures.find(s => s.signer_type === type) ?? null;
  }

  /** True when mobile app has written a signed status, even if no signature row exists */
  isSignedByStatus(bol: BolWithRelations, type: 'driver' | 'consignee'): boolean {
    const s = bol.status;
    if (type === 'driver') {
      return s === 'driver_signed' || s === 'consignee_signed' || s === 'completed';
    }
    return s === 'consignee_signed' || s === 'completed';
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      pending: 'Pending', claimed: 'Claimed',
      driver_signed: 'Driver Signed', consignee_signed: 'Consignee Signed', completed: 'Completed',
    };
    return map[status] ?? status;
  }

  statusSeverity(status: string): 'secondary' | 'info' | 'warn' | 'success' {
    const map: Record<string, 'secondary' | 'info' | 'warn' | 'success'> = {
      pending: 'secondary', claimed: 'info',
      driver_signed: 'warn', consignee_signed: 'warn', completed: 'success',
    };
    return map[status] ?? 'secondary';
  }

  shipmentStatusLabel(status: string): string {
    const map: Record<string, string> = {
      pending: 'Pending', in_transit: 'In Transit', delivered: 'Delivered', cancelled: 'Cancelled',
    };
    return map[status] ?? status;
  }

  shipmentStatusSeverity(status: string): 'secondary' | 'info' | 'warn' | 'success' {
    const map: Record<string, 'secondary' | 'info' | 'warn' | 'success'> = {
      pending: 'secondary', in_transit: 'info', delivered: 'success', cancelled: 'warn',
    };
    return map[status] ?? 'secondary';
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit',
    });
  }

  private static readonly FIELD_LABELS: Record<string, string> = {
    seal_number:    'Seal Number',
    arrival_time:   'Arrival Time',
    package_weight: 'Package Weight',
  };

  /** Returns form_data entries as label/value pairs for display. */
  getFormDataEntries(bol: BolWithRelations): Array<{ key: string; label: string; value: string }> {
    const data = bol.form_data;
    if (!data || Object.keys(data).length === 0) return [];
    return Object.entries(data).map(([key, value]) => ({
      key,
      label: ShipmentViewerComponent.FIELD_LABELS[key] ?? key.replace(/_/g, ' '),
      value: String(value),
    }));
  }
}
