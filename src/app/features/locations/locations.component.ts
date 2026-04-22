import { DecimalPipe } from '@angular/common';
import {
  afterNextRender,
  Component,
  computed,
  ElementRef,
  inject,
  NgZone,
  OnDestroy,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ConfirmationService, MessageService } from 'primeng/api';
import { SkeletonModule } from 'primeng/skeleton';
import * as L from 'leaflet';
import { fromEvent, Subscription } from 'rxjs';
import { LocationsService, type Location } from './locations.service';
import { GeocodingService } from './geocoding.service';

type PanelMode = 'list' | 'detail' | 'edit' | 'create';

@Component({
  selector: 'ebol-locations',
  imports: [DecimalPipe, ReactiveFormsModule, ButtonModule, InputTextModule, SkeletonModule],
  host: { class: 'locations-host' },
  styles: [
    `
      @keyframes slide-in-right {
        from { transform: translateX(100%); opacity: 0; }
        to   { transform: translateX(0);    opacity: 1; }
      }
      @keyframes fade-up {
        from { opacity: 0; transform: translateY(6px); }
        to   { opacity: 1; transform: translateY(0); }
      }

      :host {
        display: flex;
        flex: 1;
        min-height: 0;
        width: 100%;
        overflow: hidden;
      }
      .layout {
        display: flex;
        flex: 1;
        min-height: 0;
        width: 100%;
        overflow: hidden;
      }

      /* ── MAP ─────────────────────────────── */
      .map-wrap {
        flex: 1;
        min-width: 0;
        min-height: 0;
        position: relative;
      }
      .map-el {
        position: absolute;
        inset: 0;
        z-index: 0;
      }
      .map-toolbar {
        position: absolute;
        top: 14px;
        left: 56px;
        z-index: 400;
      }
      .add-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        padding: 0 1.1rem;
        height: 36px;
        background: #004b87;
        color: #fff;
        font-size: 13px;
        font-weight: 600;
        font-family: inherit;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(0,75,135,0.35);
        letter-spacing: 0.01em;
        transition: background 0.15s, box-shadow 0.15s, transform 0.1s;
      }
      .add-btn:hover {
        background: #003d70;
        box-shadow: 0 4px 14px rgba(0,75,135,0.45);
        transform: translateY(-1px);
      }
      .add-btn:active { transform: translateY(0); }
      .osm-attribution {
        position: absolute;
        right: 8px;
        bottom: 4px;
        z-index: 400;
        font-size: 10px;
        color: #64748b;
        background: rgba(255,255,255,0.88);
        padding: 2px 6px;
        border-radius: 4px;
        backdrop-filter: blur(4px);
      }
      .osm-attribution a { color: #004b87; }

      /* ── PANEL SHELL ─────────────────────── */
      .panel {
        width: 400px;
        flex-shrink: 0;
        display: flex;
        flex-direction: column;
        height: 100%;
        overflow: hidden;
        background: #f8fafc;
        border-left: 1px solid #e2e8f0;
        box-shadow: -4px 0 24px rgba(0,0,0,0.07);
        animation: slide-in-right 0.24s cubic-bezier(0.22,1,0.36,1);
      }

      /* ── PANEL HEADER ───────────────────── */
      .panel-header {
        flex-shrink: 0;
        padding: 0 1.25rem;
        background: #fff;
        border-bottom: 1px solid #e2e8f0;
      }
      .panel-header-inner {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        min-height: 58px;
      }
      .back-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border: none;
        border-radius: 8px;
        background: #f1f5f9;
        color: #475569;
        cursor: pointer;
        font-size: 14px;
        flex-shrink: 0;
        transition: background 0.15s, color 0.15s;
      }
      .back-btn:hover { background: #e2e8f0; color: #1e293b; }
      .panel-title-wrap { flex: 1; min-width: 0; }
      .panel-title {
        font-size: 15px;
        font-weight: 700;
        color: #0f172a;
        margin: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .panel-sub {
        font-size: 11px;
        color: #94a3b8;
        margin: 0;
        margin-top: 1px;
      }
      .count-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 22px;
        height: 22px;
        padding: 0 6px;
        background: #004b87;
        color: #fff;
        font-size: 11px;
        font-weight: 700;
        border-radius: 11px;
        flex-shrink: 0;
      }

      /* ── SEARCH ─────────────────────────── */
      .search-wrap {
        flex-shrink: 0;
        padding: 0.75rem 1.25rem;
        background: #fff;
        border-bottom: 1px solid #e2e8f0;
      }
      .search-input-wrap {
        position: relative;
      }
      .search-icon {
        position: absolute;
        left: 10px;
        top: 50%;
        transform: translateY(-50%);
        color: #94a3b8;
        font-size: 13px;
        pointer-events: none;
      }
      .search-input {
        width: 100%;
        height: 36px;
        padding: 0 0.75rem 0 2.1rem;
        border: 1.5px solid #e2e8f0;
        border-radius: 8px;
        background: #f8fafc;
        font-size: 13px;
        font-family: inherit;
        color: #1e293b;
        outline: none;
        box-sizing: border-box;
        transition: border-color 0.15s, background 0.15s;
      }
      .search-input:focus {
        border-color: #004b87;
        background: #fff;
      }
      .search-input::placeholder { color: #94a3b8; }

      /* ── PANEL BODY ─────────────────────── */
      .panel-body {
        flex: 1;
        overflow-y: auto;
        scroll-behavior: smooth;
      }
      .panel-body::-webkit-scrollbar { width: 4px; }
      .panel-body::-webkit-scrollbar-track { background: transparent; }
      .panel-body::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }

      /* ── SKELETON ───────────────────────── */
      .skeleton-list { padding: 0.75rem 1.25rem; display: flex; flex-direction: column; gap: 0.6rem; }

      /* ── LOCATION LIST ──────────────────── */
      .loc-list { padding: 0.5rem 0; }
      .loc-card {
        display: flex;
        align-items: center;
        gap: 0.875rem;
        padding: 0.875rem 1.25rem;
        cursor: pointer;
        border-left: 3px solid transparent;
        transition: background 0.12s, border-color 0.12s;
        animation: fade-up 0.18s ease-out both;
      }
      .loc-card:hover { background: #fff; border-left-color: #93c5fd; }
      .loc-card.is-selected { background: #fff; border-left-color: #004b87; }
      .loc-pin-dot {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: #dbeafe;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        font-size: 15px;
        color: #1d4ed8;
        transition: background 0.12s;
      }
      .loc-card.is-selected .loc-pin-dot { background: #004b87; color: #fff; }
      .loc-card:hover:not(.is-selected) .loc-pin-dot { background: #bfdbfe; }
      .loc-card-body { flex: 1; min-width: 0; }
      .loc-card-name {
        font-size: 13px;
        font-weight: 600;
        color: #0f172a;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        margin-bottom: 2px;
      }
      .loc-card-meta {
        font-size: 11px;
        color: #64748b;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .division-chip {
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.04em;
        color: #3b82f6;
        background: #eff6ff;
        border-radius: 4px;
        padding: 2px 6px;
        flex-shrink: 0;
        white-space: nowrap;
        max-width: 90px;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .loc-card-chevron { color: #cbd5e1; font-size: 12px; flex-shrink: 0; }
      .no-results {
        padding: 2.5rem 1.25rem;
        text-align: center;
        color: #94a3b8;
        font-size: 13px;
      }

      /* ── DETAIL VIEW ────────────────────── */
      .detail-hero {
        padding: 1.25rem 1.25rem 1rem;
        background: #fff;
        border-bottom: 1px solid #e2e8f0;
      }
      .detail-name {
        font-size: 17px;
        font-weight: 800;
        color: #0f172a;
        margin: 0 0 0.4rem;
        line-height: 1.3;
      }
      .detail-chips { display: flex; flex-wrap: wrap; gap: 0.35rem; }
      .chip {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        font-size: 11px;
        font-weight: 600;
        padding: 3px 8px;
        border-radius: 20px;
      }
      .chip-blue  { background: #dbeafe; color: #1d4ed8; }
      .chip-green { background: #dcfce7; color: #15803d; }
      .chip-amber { background: #fef9c3; color: #92400e; }
      .chip-slate { background: #f1f5f9; color: #475569; }

      .detail-sections { padding: 0.75rem 1.25rem 1.5rem; }
      .detail-row {
        display: flex;
        align-items: flex-start;
        gap: 0.875rem;
        padding: 0.875rem 0;
        border-bottom: 1px solid #f1f5f9;
      }
      .detail-row:last-child { border-bottom: none; }
      .detail-icon {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        background: #f1f5f9;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #475569;
        font-size: 13px;
        flex-shrink: 0;
        margin-top: 1px;
      }
      .detail-icon.blue  { background: #dbeafe; color: #1d4ed8; }
      .detail-icon.green { background: #dcfce7; color: #15803d; }
      .detail-icon.purple{ background: #f3e8ff; color: #7c3aed; }
      .detail-content { flex: 1; min-width: 0; }
      .detail-label {
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.07em;
        color: #94a3b8;
        margin: 0 0 3px;
      }
      .detail-value {
        font-size: 13px;
        color: #1e293b;
        line-height: 1.5;
        margin: 0;
      }
      .coord-note {
        font-size: 11px;
        color: #d97706;
        display: flex;
        align-items: center;
        gap: 4px;
        margin-top: 2px;
      }
      .detail-actions {
        display: flex;
        gap: 0.5rem;
        padding: 0 1.25rem 1.25rem;
        background: #fff;
        border-top: 1px solid #e2e8f0;
        padding-top: 1rem;
        margin-top: auto;
        flex-shrink: 0;
      }
      .detail-edit-btn {
        flex: 1;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.35rem;
        height: 38px;
        background: #004b87;
        color: #fff;
        border: none;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 600;
        font-family: inherit;
        cursor: pointer;
        transition: background 0.15s, transform 0.1s;
      }
      .detail-edit-btn:hover { background: #003d70; transform: translateY(-1px); }
      .detail-del-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.35rem;
        height: 38px;
        padding: 0 1rem;
        background: #fff;
        color: #dc2626;
        border: 1.5px solid #fecaca;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 600;
        font-family: inherit;
        cursor: pointer;
        transition: background 0.15s, border-color 0.15s;
      }
      .detail-del-btn:hover { background: #fef2f2; border-color: #f87171; }

      /* ── FORM ───────────────────────────── */
      .form-body { padding: 1rem 1.25rem 1.5rem; }
      .form-section {
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        padding: 1rem;
        margin-bottom: 0.875rem;
      }
      .form-section-title {
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #004b87;
        margin: 0 0 0.875rem;
        display: flex;
        align-items: center;
        gap: 0.4rem;
      }
      .field { margin-bottom: 0.875rem; }
      .field:last-child { margin-bottom: 0; }
      .field label {
        display: block;
        font-size: 12px;
        font-weight: 600;
        color: #475569;
        margin-bottom: 0.3rem;
        letter-spacing: 0.01em;
      }
      .field input {
        width: 100%;
        height: 36px;
        padding: 0 0.75rem;
        border: 1.5px solid #e2e8f0;
        border-radius: 7px;
        font-size: 13px;
        font-family: inherit;
        color: #1e293b;
        background: #f8fafc;
        outline: none;
        box-sizing: border-box;
        transition: border-color 0.15s, background 0.15s;
      }
      .field input:focus { border-color: #004b87; background: #fff; }
      .field input::placeholder { color: #94a3b8; }
      .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
      .error-msg { font-size: 11px; color: #dc2626; margin-top: 3px; }
      .field-hint { font-weight: 400; color: #94a3b8; font-size: 10px; }
      .geocode-note {
        font-size: 11px;
        color: #64748b;
        display: flex;
        align-items: center;
        gap: 4px;
        margin-top: 0.5rem;
      }
      .form-actions {
        display: flex;
        gap: 0.5rem;
        padding-top: 0.25rem;
      }
      .form-save-btn {
        flex: 1;
        height: 38px;
        background: #004b87;
        color: #fff;
        border: none;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 600;
        font-family: inherit;
        cursor: pointer;
        transition: background 0.15s;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.35rem;
      }
      .form-save-btn:hover:not(:disabled) { background: #003d70; }
      .form-save-btn:disabled { opacity: 0.55; cursor: not-allowed; }
      .form-cancel-btn {
        height: 38px;
        padding: 0 1rem;
        background: #f1f5f9;
        color: #475569;
        border: none;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 600;
        font-family: inherit;
        cursor: pointer;
        transition: background 0.15s;
      }
      .form-cancel-btn:hover { background: #e2e8f0; }
    `,
  ],
  template: `
    <div class="layout">
      <div class="map-wrap">
        <div class="map-el" #mapContainer></div>
        <div class="map-toolbar">
          <button type="button" class="add-btn" (click)="startCreate()">
            <i class="pi pi-plus" style="font-size:11px"></i> Add location
          </button>
        </div>
        <div class="osm-attribution">
          © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>
        </div>
      </div>

      <aside class="panel">

        <!-- HEADER -->
        <div class="panel-header">
          <div class="panel-header-inner">
            @if (panelMode() !== 'list') {
              <button type="button" class="back-btn" (click)="goBackToList()" title="Back to list">
                <i class="pi pi-arrow-left"></i>
              </button>
            }
            <div class="panel-title-wrap">
              @if (panelMode() === 'list') {
                <p class="panel-title">Locations</p>
                <p class="panel-sub">{{ locations().length }} total · click a pin or card to view</p>
              } @else if (panelMode() === 'detail' && selectedLocation(); as loc) {
                <p class="panel-title">{{ loc.name }}</p>
                <p class="panel-sub">{{ loc.city }}, {{ loc.state }}</p>
              } @else if (panelMode() === 'create') {
                <p class="panel-title">New Location</p>
                <p class="panel-sub">Fill in the details below</p>
              } @else if (panelMode() === 'edit') {
                <p class="panel-title">Edit Location</p>
                <p class="panel-sub">Update the details below</p>
              }
            </div>
            @if (panelMode() === 'list') {
              <span class="count-badge">{{ filteredLocations().length }}</span>
            }
          </div>
        </div>

        <!-- SEARCH (list mode only) -->
        @if (panelMode() === 'list') {
          <div class="search-wrap">
            <div class="search-input-wrap">
              <i class="pi pi-search search-icon"></i>
              <input
                class="search-input"
                type="text"
                placeholder="Search locations…"
                [value]="search()"
                (input)="search.set($any($event.target).value)"
              />
            </div>
          </div>
        }

        <!-- BODY -->
        <div class="panel-body">

          @if (loading()) {
            <div class="skeleton-list">
              @for (i of [1,2,3,4,5]; track i) {
                <p-skeleton height="56px" borderRadius="10px" />
              }
            </div>

          } @else if (panelMode() === 'list') {
            <div class="loc-list">
              @if (filteredLocations().length === 0) {
                <div class="no-results">
                  <i class="pi pi-map-marker" style="font-size:2rem;display:block;margin-bottom:0.5rem;opacity:0.3"></i>
                  No locations match "{{ search() }}"
                </div>
              }
              @for (loc of filteredLocations(); track loc.id; let i = $index) {
                <div
                  class="loc-card"
                  [class.is-selected]="selectedId() === loc.id"
                  (click)="selectById(loc.id)"
                  [style.animation-delay]="(i * 30) + 'ms'"
                >
                  <div class="loc-pin-dot">
                    <i class="pi pi-map-marker"></i>
                  </div>
                  <div class="loc-card-body">
                    <div class="loc-card-name">{{ loc.name }}</div>
                    <div class="loc-card-meta">{{ loc.city }}, {{ loc.state }} · {{ loc.address }}</div>
                  </div>
                  @if (loc.division) {
                    <span class="division-chip">{{ loc.division }}</span>
                  }
                  <i class="pi pi-chevron-right loc-card-chevron"></i>
                </div>
              }
            </div>

          } @else if (panelMode() === 'detail' && selectedLocation(); as loc) {
            <div class="detail-hero">
              <p class="detail-name">{{ loc.name }}</p>
              <div class="detail-chips">
                @if (loc.division) { <span class="chip chip-blue"><i class="pi pi-building"></i>{{ loc.division }}</span> }
                @if (loc.latitude != null) {
                  <span class="chip chip-green"><i class="pi pi-map-marker"></i>On map</span>
                } @else {
                  <span class="chip chip-amber"><i class="pi pi-exclamation-triangle"></i>No coordinates</span>
                }
                <span class="chip chip-slate"><i class="pi pi-circle"></i>{{ loc.geofence_radius | number:'1.2-2' }} mi radius</span>
              </div>
            </div>

            <div class="detail-sections">
              <div class="detail-row">
                <div class="detail-icon blue"><i class="pi pi-map-marker"></i></div>
                <div class="detail-content">
                  <p class="detail-label">Address</p>
                  <p class="detail-value">
                    {{ loc.address }}<br/>{{ loc.city }}, {{ loc.state }} {{ loc.zip }}<br/>{{ loc.country }}
                  </p>
                </div>
              </div>

              @if (loc.latitude != null && loc.longitude != null) {
                <div class="detail-row">
                  <div class="detail-icon green"><i class="pi pi-compass"></i></div>
                  <div class="detail-content">
                    <p class="detail-label">Coordinates</p>
                    <p class="detail-value">{{ loc.latitude | number:'1.4-4' }}, {{ loc.longitude | number:'1.4-4' }}</p>
                  </div>
                </div>
              } @else {
                <div class="detail-row">
                  <div class="detail-icon"><i class="pi pi-compass"></i></div>
                  <div class="detail-content">
                    <p class="detail-label">Coordinates</p>
                    <p class="coord-note"><i class="pi pi-info-circle"></i>Edit &amp; save to geocode this address</p>
                  </div>
                </div>
              }

              @if (loc.description) {
                <div class="detail-row">
                  <div class="detail-icon"><i class="pi pi-align-left"></i></div>
                  <div class="detail-content">
                    <p class="detail-label">Description</p>
                    <p class="detail-value">{{ loc.description }}</p>
                  </div>
                </div>
              }

              @if (loc.contact_name || loc.contact_phone || loc.contact_email) {
                <div class="detail-row">
                  <div class="detail-icon purple"><i class="pi pi-user"></i></div>
                  <div class="detail-content">
                    <p class="detail-label">Contact</p>
                    @if (loc.contact_name)  { <p class="detail-value">{{ loc.contact_name }}</p> }
                    @if (loc.contact_phone) { <p class="detail-value" style="color:#64748b">{{ loc.contact_phone }}</p> }
                    @if (loc.contact_email) { <p class="detail-value" style="color:#64748b">{{ loc.contact_email }}</p> }
                  </div>
                </div>
              }
            </div>

            <div class="detail-actions">
              <button type="button" class="detail-edit-btn" (click)="startEdit()">
                <i class="pi pi-pencil"></i> Edit
              </button>
              <button type="button" class="detail-del-btn" (click)="confirmDelete(loc)">
                <i class="pi pi-trash"></i> Delete
              </button>
            </div>

          } @else if (panelMode() === 'edit' || panelMode() === 'create') {
            <form [formGroup]="form" (ngSubmit)="onSubmitForm()">
              <div class="form-body">

                <div class="form-section">
                  <p class="form-section-title"><i class="pi pi-building"></i> Facility</p>
                  <div class="field">
                    <label for="loc-division">Shipper Division</label>
                    <input id="loc-division" type="text" formControlName="division" placeholder="e.g. UNITESHIP" />
                  </div>
                  <div class="field">
                    <label for="loc-name">Pickup Location Name *</label>
                    <input id="loc-name" type="text" formControlName="name" placeholder="Warehouse A" />
                    @if (form.get('name')?.invalid && form.get('name')?.touched) {
                      <div class="error-msg">Name is required</div>
                    }
                  </div>
                  <div class="field">
                    <label for="loc-desc">Description</label>
                    <input id="loc-desc" type="text" formControlName="description" placeholder="Optional description" />
                  </div>
                </div>

                <div class="form-section">
                  <p class="form-section-title"><i class="pi pi-map-marker"></i> Address</p>
                  <div class="field">
                    <label for="loc-address">Street Address *</label>
                    <input id="loc-address" type="text" formControlName="address" placeholder="123 Main St" />
                    @if (form.get('address')?.invalid && form.get('address')?.touched) {
                      <div class="error-msg">Address is required</div>
                    }
                  </div>
                  <div class="field-row">
                    <div class="field">
                      <label for="loc-city">City *</label>
                      <input id="loc-city" type="text" formControlName="city" placeholder="Chicago" />
                      @if (form.get('city')?.invalid && form.get('city')?.touched) {
                        <div class="error-msg">Required</div>
                      }
                    </div>
                    <div class="field">
                      <label for="loc-state">State *</label>
                      <input id="loc-state" type="text" formControlName="state" placeholder="IL" maxlength="2" />
                      @if (form.get('state')?.invalid && form.get('state')?.touched) {
                        <div class="error-msg">2-letter code</div>
                      }
                    </div>
                  </div>
                  <div class="field-row">
                    <div class="field">
                      <label for="loc-zip">ZIP *</label>
                      <input id="loc-zip" type="text" formControlName="zip" placeholder="60601" maxlength="10" />
                      @if (form.get('zip')?.invalid && form.get('zip')?.touched) {
                        <div class="error-msg">Required</div>
                      }
                    </div>
                    <div class="field">
                      <label for="loc-country">Country *</label>
                      <input id="loc-country" type="text" formControlName="country" placeholder="United States" />
                    </div>
                  </div>
                </div>

                <div class="form-section">
                  <p class="form-section-title"><i class="pi pi-compass"></i> Location</p>
                  <div class="field">
                    <label for="loc-geofence">GeoFence Radius * <span class="field-hint">(0.03 – 0.5 miles)</span></label>
                    <input id="loc-geofence" type="number" formControlName="geofence_radius" placeholder="0.5" step="0.01" min="0.03" max="0.5" />
                    @if (form.get('geofence_radius')?.invalid && form.get('geofence_radius')?.touched) {
                      <div class="error-msg">Enter a value between 0.03 and 0.5</div>
                    }
                  </div>
                  <p class="geocode-note"><i class="pi pi-info-circle"></i> Lat/Lng auto-populates from address on save</p>
                </div>

                <div class="form-section">
                  <p class="form-section-title"><i class="pi pi-user"></i> Contact</p>
                  <div class="field">
                    <label for="loc-contact-name">Name *</label>
                    <input id="loc-contact-name" type="text" formControlName="contact_name" placeholder="Jane Smith" />
                    @if (form.get('contact_name')?.invalid && form.get('contact_name')?.touched) {
                      <div class="error-msg">Contact name is required</div>
                    }
                  </div>
                  <div class="field">
                    <label for="loc-contact-phone">Phone *</label>
                    <input id="loc-contact-phone" type="tel" formControlName="contact_phone" placeholder="(555) 555-5555" />
                    @if (form.get('contact_phone')?.invalid && form.get('contact_phone')?.touched) {
                      <div class="error-msg">Phone is required</div>
                    }
                  </div>
                  <div class="field">
                    <label for="loc-contact-email">Email</label>
                    <input id="loc-contact-email" type="email" formControlName="contact_email" placeholder="jane@company.com" />
                  </div>
                </div>

                <div class="form-actions">
                  <button type="button" class="form-cancel-btn" (click)="cancelForm()">Cancel</button>
                  <button
                    type="submit"
                    class="form-save-btn"
                    [disabled]="form.invalid || saving()"
                  >
                    @if (saving()) { <i class="pi pi-spin pi-spinner"></i> }
                    {{ panelMode() === 'create' ? 'Save Location' : 'Save Changes' }}
                  </button>
                </div>

              </div>
            </form>
          }

        </div>
      </aside>
    </div>
  `,
})
export class LocationsComponent implements OnInit, OnDestroy {
  private locationsService = inject(LocationsService);
  private geocoding = inject(GeocodingService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private fb = inject(FormBuilder);
  private zone = inject(NgZone);

  private mapContainer = viewChild.required<ElementRef<HTMLElement>>('mapContainer');

  locations = signal<Location[]>([]);
  loading = signal(true);
  saving = signal(false);
  panelMode = signal<PanelMode>('list');
  selectedId = signal<string | null>(null);
  search = signal('');

  selectedLocation = computed(() => {
    const id = this.selectedId();
    if (!id) return null;
    return this.locations().find((l) => l.id === id) ?? null;
  });

  filteredLocations = computed(() => {
    const q = this.search().toLowerCase().trim();
    if (!q) return this.locations();
    return this.locations().filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.city.toLowerCase().includes(q) ||
        l.state.toLowerCase().includes(q) ||
        (l.division ?? '').toLowerCase().includes(q),
    );
  });

  form = this.fb.group({
    division: [''],
    name: ['', Validators.required],
    description: [''],
    address: ['', Validators.required],
    city: ['', Validators.required],
    state: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(2)]],
    zip: ['', Validators.required],
    country: ['United States', Validators.required],
    geofence_radius: [0.5, [Validators.required, Validators.min(0.03), Validators.max(0.5)]],
    contact_name: ['', Validators.required],
    contact_phone: ['', Validators.required],
    contact_email: [''],
  });

  private map: L.Map | null = null;
  private markerLayer = L.layerGroup();
  private markersById = new Map<string, L.Marker>();
  private resizeSub: Subscription | null = null;
  private didFitBounds = false;

  constructor() {
    afterNextRender(() => this.initMap());
  }

  ngOnInit(): void {
    void this.load();
  }

  ngOnDestroy(): void {
    this.resizeSub?.unsubscribe();
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const data = await this.locationsService.list();
      this.locations.set(data);
      this.redrawMarkers();
    } catch {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load locations.' });
    } finally {
      this.loading.set(false);
    }
  }

  private initMap(): void {
    const el = this.mapContainer().nativeElement;
    this.zone.runOutsideAngular(() => {
      const map = L.map(el, { zoomControl: true }).setView([39.8283, -98.5795], 4);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '',
      }).addTo(map);

      this.markerLayer.addTo(map);
      map.on('click', () => {
        this.zone.run(() => {
          const mode = this.panelMode();
          if (mode === 'edit' || mode === 'create') return;
          this.selectedId.set(null);
          this.panelMode.set('list');
          this.redrawMarkers();
        });
      });

      this.map = map;
      this.resizeSub = fromEvent(window, 'resize').subscribe(() => map.invalidateSize());
      setTimeout(() => map.invalidateSize(), 0);
    });
    this.redrawMarkers();
  }

  goBackToList(): void {
    const mode = this.panelMode();
    if (mode === 'edit') {
      this.panelMode.set('detail');
      return;
    }
    this.selectedId.set(null);
    this.panelMode.set('list');
    this.redrawMarkers();
  }

  selectById(id: string): void {
    this.selectedId.set(id);
    this.panelMode.set('detail');
    this.redrawMarkers();
    const loc = this.locations().find((l) => l.id === id);
    if (loc?.latitude != null && loc.longitude != null && this.map) {
      this.zone.runOutsideAngular(() =>
        this.map!.flyTo([loc.latitude!, loc.longitude!], Math.max(this.map!.getZoom(), 12), { duration: 0.8 }),
      );
    }
  }

  startCreate(): void {
    this.selectedId.set(null);
    this.panelMode.set('create');
    this.form.reset({ country: 'United States', geofence_radius: 0.5 });
    this.redrawMarkers();
  }

  startEdit(): void {
    const loc = this.selectedLocation();
    if (!loc) return;
    this.panelMode.set('edit');
    this.form.patchValue({
      division: loc.division ?? '',
      name: loc.name,
      description: loc.description ?? '',
      address: loc.address,
      city: loc.city,
      state: loc.state,
      zip: loc.zip,
      country: loc.country ?? 'United States',
      geofence_radius: loc.geofence_radius ?? 0.5,
      contact_name: loc.contact_name ?? '',
      contact_phone: loc.contact_phone ?? '',
      contact_email: loc.contact_email ?? '',
    });
  }

  cancelForm(): void {
    if (this.panelMode() === 'create') {
      this.form.reset();
      this.panelMode.set('list');
    } else {
      this.panelMode.set('detail');
    }
  }

  private addressDirtyComparedTo(loc: Location | null, v: { address: string; city: string; state: string; zip: string; country: string }): boolean {
    if (!loc) return true;
    return v.address !== loc.address || v.city !== loc.city || v.state !== loc.state || v.zip !== loc.zip || v.country !== loc.country;
  }

  async onSubmitForm(): Promise<void> {
    if (this.form.invalid) return;

    this.saving.set(true);
    const val = this.form.getRawValue() as {
      division: string; name: string; description: string;
      address: string; city: string; state: string; zip: string; country: string;
      geofence_radius: number; contact_name: string; contact_phone: string; contact_email: string;
    };

    const payload = {
      division: val.division || null,
      name: val.name,
      description: val.description || null,
      address: val.address,
      city: val.city,
      state: val.state,
      zip: val.zip,
      country: val.country,
      geofence_radius: val.geofence_radius,
      contact_name: val.contact_name || null,
      contact_phone: val.contact_phone || null,
      contact_email: val.contact_email || null,
    };

    try {
      if (this.panelMode() === 'create') {
        const g = await this.geocoding.geocodeAddress(val.address, val.city, val.state, val.zip);
        if (!g) this.messageService.add({ severity: 'warn', summary: 'Geocoding', detail: 'Could not place on map. Saved without coordinates.' });
        const created = await this.locationsService.create({ ...payload, latitude: g?.lat ?? null, longitude: g?.lng ?? null });
        this.locations.update((list) => [...list, created]);
        this.selectedId.set(created.id);
        this.panelMode.set('detail');
        this.form.reset();
        this.messageService.add({ severity: 'success', summary: 'Added', detail: 'Location created.' });
        this.redrawMarkers();
        return;
      }

      const sel = this.selectedLocation();
      if (!sel) return;

      let latitude = sel.latitude;
      let longitude = sel.longitude;
      if (this.addressDirtyComparedTo(sel, val)) {
        const g = await this.geocoding.geocodeAddress(val.address, val.city, val.state, val.zip);
        if (!g) {
          this.messageService.add({ severity: 'warn', summary: 'Geocoding', detail: 'Could not update position. Coordinates cleared.' });
          latitude = null; longitude = null;
        } else {
          latitude = g.lat; longitude = g.lng;
        }
      }

      const updated = await this.locationsService.update(sel.id, { ...payload, latitude, longitude });
      this.locations.update((list) => list.map((l) => (l.id === updated.id ? updated : l)));
      this.panelMode.set('detail');
      this.messageService.add({ severity: 'success', summary: 'Saved', detail: 'Location updated.' });
      this.redrawMarkers();
    } catch (err) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: err instanceof Error ? err.message : 'Operation failed.' });
    } finally {
      this.saving.set(false);
    }
  }

  confirmDelete(loc: Location): void {
    this.confirmationService.confirm({
      message: `Delete <strong>${loc.name}</strong>? This cannot be undone.`,
      header: 'Delete location',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => void this.doDelete(loc),
    });
  }

  private async doDelete(loc: Location): Promise<void> {
    try {
      await this.locationsService.delete(loc.id);
      this.locations.update((list) => list.filter((l) => l.id !== loc.id));
      if (this.selectedId() === loc.id) { this.selectedId.set(null); this.panelMode.set('list'); }
      this.messageService.add({ severity: 'success', summary: 'Deleted', detail: `${loc.name} removed.` });
      this.redrawMarkers();
    } catch (err) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: err instanceof Error ? err.message : 'Delete failed.' });
    }
  }

  private pinIcon(isSelected: boolean): L.DivIcon {
    const color = isSelected ? '#dc2626' : '#1a56db';
    const shadow = isSelected
      ? 'drop-shadow(0 3px 10px rgba(220,38,38,0.6))'
      : 'drop-shadow(0 2px 6px rgba(26,86,219,0.45))';
    const w = isSelected ? 34 : 26;
    const h = Math.round(w * 1.4);
    const cx = w / 2;
    const r = cx;
    const tipY = h;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="filter:${shadow};display:block;overflow:visible">
      <path d="M${cx} 0C${(cx * 0.447).toFixed(1)} 0 0 ${(cx * 0.447).toFixed(1)} 0 ${r}c0 ${(r * 0.9).toFixed(1)} ${cx} ${(tipY - r).toFixed(1)} ${cx} ${(tipY - r).toFixed(1)}S${w} ${(r + r * 0.9).toFixed(1)} ${w} ${r}C${w} ${(cx * 0.447).toFixed(1)} ${(cx + cx * 0.553).toFixed(1)} 0 ${cx} 0z" fill="${color}"/>
      <circle cx="${cx}" cy="${r}" r="${(r * 0.38).toFixed(1)}" fill="white" opacity="0.95"/>
    </svg>`;
    return L.divIcon({
      html: svg,
      className: '',
      iconSize: [w, h],
      iconAnchor: [cx, h],
      popupAnchor: [0, -h],
    });
  }

  private redrawMarkers(): void {
    if (!this.map) return;

    this.zone.runOutsideAngular(() => {
      this.markerLayer.clearLayers();
      this.markersById.clear();

      const latlngs: L.LatLngExpression[] = [];
      const sel = this.selectedId();

      for (const loc of this.locations()) {
        if (loc.latitude == null || loc.longitude == null) continue;
        const ll: L.LatLngExpression = [loc.latitude, loc.longitude];
        latlngs.push(ll);
        const isSelected = loc.id === sel;
        const m = L.marker(ll, { icon: this.pinIcon(isSelected), zIndexOffset: isSelected ? 1000 : 0 });
        m.on('click', (e: L.LeafletMouseEvent) => {
          L.DomEvent.stopPropagation(e);
          this.zone.run(() => {
            this.selectedId.set(loc.id);
            this.panelMode.set('detail');
            this.redrawMarkers();
          });
        });
        m.addTo(this.markerLayer);
        this.markersById.set(loc.id, m);
      }

      if (latlngs.length === 0) {
        this.didFitBounds = false;
      } else if (!this.didFitBounds) {
        this.map!.fitBounds(L.latLngBounds(latlngs), { padding: [40, 40], maxZoom: 12 });
        this.didFitBounds = true;
      }

      setTimeout(() => this.map?.invalidateSize(), 0);
    });
  }
}
