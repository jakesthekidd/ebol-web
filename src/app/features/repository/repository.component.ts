import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { TooltipModule } from 'primeng/tooltip';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { BolsService, type BolWithRelations } from '../bols/bols.service';
import type { Tables } from '../../lib/supabase/database.types';
import { supabase } from '../../lib/supabase/client';

type Shipment = Tables<'shipments'>;
type BolStatus = 'all' | 'pending' | 'claimed' | 'driver_signed' | 'consignee_signed' | 'completed';

interface ShipmentRow {
  id: string;
  shipment: Shipment;
  bols: BolWithRelations[];
  stopCount: number;
  bolCount: number;
  driverSignedCount: number;
  consigneeSignedCount: number;
  overallStatus: Exclude<BolStatus, 'all'>;
  createdAt: string;
}

@Component({
  selector: 'ebol-repository',
  imports: [
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    TagModule,
    SelectModule,
    SkeletonModule,
    IconFieldModule,
    InputIconModule,
    TooltipModule,
  ],
  styles: [`
    .page { padding: 2rem; }

    .page-header {
      display: flex; align-items: flex-start; justify-content: space-between;
      margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;
    }
    .page-title { font-size: 1.25rem; font-weight: 700; color: var(--p-text-color); margin: 0 0 0.25rem; }
    .page-sub   { font-size: 13px; color: var(--p-text-muted-color); margin: 0; }
    .toolbar { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }

    /* Upload success */
    .upload-success {
      display: flex; align-items: center; gap: 0.75rem;
      padding: 0.875rem 1.25rem; background: #f0fdf4;
      border: 1px solid #86efac; border-radius: 10px;
      margin-bottom: 1.25rem; animation: fade-in 0.3s ease-out;
    }
    .upload-success i { color: #16a34a; font-size: 16px; }
    .upload-success-text { font-size: 13px; font-weight: 600; color: #15803d; flex: 1; }
    .upload-success-dismiss {
      background: none; border: none; cursor: pointer;
      color: #16a34a; font-size: 14px; padding: 2px;
    }
    @keyframes fade-in {
      from { opacity: 0; transform: translateY(-4px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* Row toggle */
    .row-toggle-btn {
      width: 28px; height: 28px; border-radius: 6px;
      background: none; border: none; cursor: pointer;
      color: var(--p-text-muted-color);
      display: flex; align-items: center; justify-content: center;
      transition: background 0.15s, color 0.15s;
    }
    .row-toggle-btn:hover { background: var(--p-content-hover-background); color: var(--p-text-color); }

    /* Live badge */
    .live-badge {
      display: inline-flex; align-items: center; gap: 0.375rem;
      font-size: 11px; color: var(--p-green-600); font-weight: 600;
    }
    .live-dot {
      width: 6px; height: 6px; border-radius: 50%;
      background: var(--p-green-500); animation: pulse 1.5s infinite;
    }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }

    /* Empty state */
    .empty-state {
      text-align: center; padding: 4rem 1rem; color: var(--p-text-muted-color);
    }
    .empty-state i { font-size: 3rem; opacity: 0.3; margin-bottom: 1rem; }
    .empty-state p { margin: 0.5rem 0 1.25rem; font-size: 14px; }

    /* ── SHIPMENT ROW ── */
    .shipment-number-link {
      font-weight: 700; font-size: 13px;
      color: var(--p-primary-600); cursor: pointer; text-decoration: none;
    }
    .shipment-number-link:hover { text-decoration: underline; color: var(--p-primary-800); }

    .stop-badge, .bol-badge {
      display: inline-flex; align-items: center; gap: 4px;
      font-size: 11px; font-weight: 700; padding: 2px 8px;
      border-radius: 10px;
    }
    .stop-badge { background: #f1f5f9; color: #475569; }
    .bol-badge  { background: #eff6ff; color: #1d4ed8; }

    /* Signature progress */
    .sig-progress { display: flex; flex-direction: column; gap: 3px; }
    .sig-progress-row { display: flex; align-items: center; gap: 6px; font-size: 11px; }
    .sig-progress-label { color: var(--p-text-muted-color); font-weight: 600; width: 62px; }
    .sig-progress-val { font-weight: 700; }
    .sig-progress-val.none  { color: var(--p-text-muted-color); }
    .sig-progress-val.some  { color: #d97706; }
    .sig-progress-val.all   { color: #16a34a; }
    .sig-pips { display: flex; gap: 2px; }
    .sig-pip {
      width: 6px; height: 6px; border-radius: 50%;
    }
    .sig-pip.filled { background: #16a34a; }
    .sig-pip.partial { background: #d97706; }
    .sig-pip.empty  { background: #e2e8f0; }

    /* ── TABS ── */
    .tab-bar {
      display: flex; align-items: stretch; gap: 0;
      border-bottom: 1px solid var(--p-content-border-color);
      margin-bottom: 1.25rem;
    }
    .tab-btn {
      display: flex; align-items: center; gap: 0.4rem;
      padding: 0.625rem 1.125rem; font-size: 12px; font-weight: 600;
      color: var(--p-text-muted-color); background: none; border: none;
      border-bottom: 2px solid transparent; margin-bottom: -1px;
      cursor: pointer; font-family: inherit; white-space: nowrap;
      transition: color 0.15s, border-color 0.15s;
    }
    .tab-btn:hover { color: var(--p-text-color); }
    .tab-btn.active { color: #004b87; border-bottom-color: #004b87; }
    .tab-count {
      display: inline-flex; align-items: center; justify-content: center;
      background: #e2e8f0; color: #475569; font-size: 10px; font-weight: 800;
      border-radius: 10px; min-width: 18px; height: 18px; padding: 0 5px; line-height: 1;
    }
    .tab-btn.active .tab-count { background: #dbeafe; color: #1d4ed8; }

    /* ── BOL BADGES IN MAIN ROW ── */
    .bol-badges { display: flex; flex-wrap: wrap; gap: 4px; }

    /* Date cell */
    .date-cell { line-height: 1.35; }
    .date-main { font-size: 12px; color: var(--p-text-color); font-weight: 500; }
    .date-time { font-size: 11px; color: var(--p-text-muted-color); }

    /* ── EXPANSION SUB-TABLE ── */
    .expansion-wrap {
      padding: 0 0 0.5rem 2.75rem;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
    }
    .expansion-inner {
      border: 1px solid #e2e8f0; border-radius: 8px;
      overflow: hidden; margin: 0.625rem 1rem 0.625rem 0;
    }
    .bol-table { width: 100%; border-collapse: collapse; }
    .bol-table thead tr {
      background: #f1f5f9;
    }
    .bol-table thead th {
      padding: 0.45rem 0.875rem; font-size: 10px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.07em; color: #64748b;
      text-align: left; white-space: nowrap;
      border-bottom: 1px solid #e2e8f0;
    }
    .bol-table tbody tr { border-bottom: 1px solid #f1f5f9; }
    .bol-table tbody tr:last-child { border-bottom: none; }
    .bol-table tbody tr:hover { background: #fff; }
    .bol-table td {
      padding: 0.5rem 0.875rem; font-size: 12px;
      color: var(--p-text-color); vertical-align: middle;
    }

    .bol-number-link {
      font-weight: 700; color: var(--p-primary-600); cursor: pointer;
    }
    .bol-number-link:hover { text-decoration: underline; }

    .stop-name-cell { color: #475569; font-size: 12px; max-width: 180px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .stop-seq {
      display: inline-flex; align-items: center; justify-content: center;
      width: 18px; height: 18px; border-radius: 50%;
      background: #e2e8f0; color: #475569;
      font-size: 10px; font-weight: 700; margin-right: 5px; flex-shrink: 0;
    }

    /* Signature cell in sub-table */
    .sig-cell {
      display: flex; align-items: center; gap: 6px; font-size: 11px;
    }
    .sig-cell.signed { color: #15803d; font-weight: 600; }
    .sig-cell.unsigned { color: var(--p-text-muted-color); }
    .sig-img {
      height: 28px; max-width: 90px; object-fit: contain;
      border: 1px solid #e2e8f0; border-radius: 4px; padding: 2px;
      background: #fff;
    }
    .sig-name { font-size: 11px; }
  `],
  template: `
    <div class="page">

      @if (showUploadSuccess()) {
        <div class="upload-success">
          <i class="pi pi-check-circle"></i>
          <span class="upload-success-text">BOL uploaded and structured successfully.</span>
          <button type="button" class="upload-success-dismiss" (click)="showUploadSuccess.set(false)">
            <i class="pi pi-times"></i>
          </button>
        </div>
      }

      <div class="page-header">
        <div>
          <h1 class="page-title">BOL Repository</h1>
          <p class="page-sub">
            All shipments for your account
            <span class="live-badge" style="margin-left: 0.75rem;">
              <span class="live-dot"></span>Live updates
            </span>
          </p>
        </div>
        <div class="toolbar">
          <p-iconfield>
            <p-inputicon class="pi pi-search" />
            <input
              type="text" pInputText
              placeholder="Search shipment, BOL, carrier…"
              [(ngModel)]="searchTerm"
              style="width: 240px;"
            />
          </p-iconfield>
          <p-button icon="pi pi-refresh" severity="secondary" [outlined]="true" size="small" (click)="refresh()" pTooltip="Refresh" />
          <p-button label="New Shipment" icon="pi pi-plus" size="small" (click)="router.navigate(['/upload'])" />
        </div>
      </div>

      <!-- Tab bar -->
      <div class="tab-bar">
        <button class="tab-btn" [class.active]="activeTab() === 'all'" (click)="activeTab.set('all')">
          All
          <span class="tab-count">{{ shipmentRows().length }}</span>
        </button>
        <button class="tab-btn" [class.active]="activeTab() === 'pending'" (click)="activeTab.set('pending')">
          Pending
          <span class="tab-count">{{ pendingCount() }}</span>
        </button>
        <button class="tab-btn" [class.active]="activeTab() === 'in_transit'" (click)="activeTab.set('in_transit')">
          In Transit
          <span class="tab-count">{{ inTransitCount() }}</span>
        </button>
        <button class="tab-btn" [class.active]="activeTab() === 'delivered'" (click)="activeTab.set('delivered')">
          Completed
          <span class="tab-count">{{ deliveredCount() }}</span>
        </button>
      </div>

      @if (loading()) {
        <p-table [value]="skeletonRows">
          <ng-template pTemplate="header">
            <tr>
              <th style="width:3.5rem"></th>
              <th>Shipment</th><th>Carrier</th><th>Stops</th>
              <th>BOLs</th><th>Signatures</th><th>Created</th><th></th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body">
            <tr>
              @for (c of [1,2,3,4,5,6,7,8]; track c) {
                <td><p-skeleton height="1rem" /></td>
              }
            </tr>
          </ng-template>
        </p-table>

      } @else if (filtered.length === 0 && shipmentRows().length === 0) {
        <div class="empty-state">
          <i class="pi pi-folder-open"></i>
          <p>No BOLs uploaded yet.</p>
          <p-button label="Upload your first BOL" icon="pi pi-upload" (click)="router.navigate(['/upload'])" />
        </div>

      } @else if (filtered.length === 0) {
        <div class="empty-state">
          <i class="pi pi-search"></i>
          <p>No shipments match your filters.</p>
          <p-button label="Clear filters" severity="secondary" [text]="true" (click)="clearFilters()" />
        </div>

      } @else {
        <p-table
          [value]="filtered"
          [paginator]="filtered.length > 20"
          [rows]="20"
          [rowsPerPageOptions]="[10, 20, 50]"
          stripedRows
          sortField="createdAt"
          [sortOrder]="-1"
        >
          <ng-template pTemplate="header">
            <tr>
              <th style="width: 3.5rem;"></th>
              <th pSortableColumn="shipment.shipment_number">
                Shipment <p-sortIcon field="shipment.shipment_number" />
              </th>
              <th>Carrier</th>
              <th>Stops</th>
              <th>BOLs</th>
              <th>BOL Status</th>
              <th pSortableColumn="createdAt">
                Created <p-sortIcon field="createdAt" />
              </th>
              <th style="width: 60px;"></th>
            </tr>
          </ng-template>

          <ng-template pTemplate="body" let-row>
            <tr>
              <!-- Expander -->
              <td>
                <button type="button" class="row-toggle-btn" (click)="toggleRow(row.id)">
                  <i [class]="expandedRows[row.id] ? 'pi pi-chevron-down' : 'pi pi-chevron-right'"></i>
                </button>
              </td>

              <!-- Shipment # -->
              <td>
                <span class="shipment-number-link" (click)="goToShipment(row)">
                  {{ row.shipment.shipment_number }}
                </span>
              </td>

              <!-- Carrier -->
              <td style="font-size:13px; color: var(--p-text-muted-color);">
                {{ row.shipment.carrier_name ?? '—' }}
              </td>

              <!-- Stops -->
              <td>
                <span class="stop-badge">
                  <i class="pi pi-map-marker" style="font-size:10px;"></i>
                  {{ row.stopCount }}
                </span>
              </td>

              <!-- BOLs -->
              <td>
                <span class="bol-badge">
                  <i class="pi pi-file" style="font-size:10px;"></i>
                  {{ row.bolCount }}
                </span>
              </td>

              <!-- BOL Status badges -->
              <td>
                <div class="bol-badges">
                  @for (bol of row.bols; track bol.id) {
                    <p-tag [value]="statusLabel(bol.status)" [severity]="statusSeverity(bol.status)" />
                  }
                </div>
              </td>

              <!-- Created -->
              <td>
                <div class="date-cell">
                  <div class="date-main">{{ formatDate(row.createdAt) }}</div>
                  @if (isRecent(row.createdAt)) {
                    <div class="date-time">{{ formatTime(row.createdAt) }}</div>
                  }
                </div>
              </td>

              <!-- Action -->
              <td>
                <p-button
                  icon="pi pi-eye" [text]="true" [rounded]="true"
                  size="small" severity="secondary"
                  (click)="goToShipment(row)"
                  pTooltip="View details"
                />
              </td>
            </tr>

            @if (expandedRows[row.id]) {
              <tr>
                <td colspan="8" style="padding: 0;">
                  <div class="expansion-wrap">
                    <div class="expansion-inner">
                      <table class="bol-table">
                        <thead>
                          <tr>
                            <th>BOL #</th>
                            <th>Stop</th>
                            <th>Status</th>
                            <th>Driver Signature</th>
                            <th>Consignee Signature</th>
                          </tr>
                        </thead>
                        <tbody>
                          @for (bol of row.bols; track bol.id) {
                            <tr>
                              <td>
                                <span class="bol-number-link" (click)="goToBolInShipment(bol)">
                                  {{ bol.bol_number }}
                                </span>
                              </td>
                              <td>
                                <div style="display:flex; align-items:center;">
                                  @if (bol.stop_sequence) {
                                    <span class="stop-seq">{{ bol.stop_sequence }}</span>
                                  }
                                  <span class="stop-name-cell">{{ bol.stop?.stop_name ?? '—' }}</span>
                                </div>
                              </td>
                              <td>
                                <p-tag [value]="statusLabel(bol.status)" [severity]="statusSeverity(bol.status)" />
                              </td>
                              <td>
                                @if (getSignature(bol, 'driver'); as sig) {
                                  <div class="sig-cell signed">
                                    @if (sig.signature_image_url) {
                                      <img class="sig-img" [src]="sig.signature_image_url" [alt]="sig.signer_name" />
                                    } @else {
                                      <i class="pi pi-check-circle" style="font-size:13px;"></i>
                                    }
                                    <span class="sig-name">{{ sig.signer_name }}</span>
                                  </div>
                                } @else {
                                  <span class="sig-cell unsigned">—</span>
                                }
                              </td>
                              <td>
                                @if (getSignature(bol, 'consignee'); as sig) {
                                  <div class="sig-cell signed">
                                    @if (sig.signature_image_url) {
                                      <img class="sig-img" [src]="sig.signature_image_url" [alt]="sig.signer_name" />
                                    } @else {
                                      <i class="pi pi-check-circle" style="font-size:13px;"></i>
                                    }
                                    <span class="sig-name">{{ sig.signer_name }}</span>
                                  </div>
                                } @else {
                                  <span class="sig-cell unsigned">—</span>
                                }
                              </td>
                            </tr>
                          }
                        </tbody>
                      </table>
                    </div>
                  </div>
                </td>
              </tr>
            }
          </ng-template>
        </p-table>
      }
    </div>
  `,
})
export class RepositoryComponent implements OnInit, OnDestroy {
  private bolsService = inject(BolsService);
  router = inject(Router);
  private route = inject(ActivatedRoute);

  loading = signal(true);
  showUploadSuccess = signal(false);
  searchTerm = '';
  statusFilter: BolStatus = 'all';
  activeTab = signal<'all' | 'pending' | 'in_transit' | 'delivered'>('all');
  shipmentRows = signal<ShipmentRow[]>([]);
  expandedRows: Record<string, boolean> = {};

  skeletonRows = Array(5).fill({});
  private channel: RealtimeChannel | null = null;
  private pollInterval: ReturnType<typeof setInterval> | null = null;

  readonly pendingCount   = computed(() => this.shipmentRows().filter(r => r.shipment.status === 'pending').length);
  readonly inTransitCount = computed(() => this.shipmentRows().filter(r => r.shipment.status === 'in_transit').length);
  readonly deliveredCount = computed(() => this.shipmentRows().filter(r => r.shipment.status === 'delivered').length);

  readonly statusOptions = [
    { label: 'All statuses',       value: 'all' },
    { label: 'Pending',            value: 'pending' },
    { label: 'Claimed',            value: 'claimed' },
    { label: 'Driver Signed',      value: 'driver_signed' },
    { label: 'Consignee Signed',   value: 'consignee_signed' },
    { label: 'Completed',          value: 'completed' },
  ];

  get filtered(): ShipmentRow[] {
    let list = this.shipmentRows();

    // Tab filter (shipment-level status)
    if (this.activeTab() !== 'all') {
      list = list.filter(row => row.shipment.status === this.activeTab());
    }

    const term = this.searchTerm.toLowerCase().trim();
    if (term) {
      list = list.filter(row =>
        row.shipment.shipment_number.toLowerCase().includes(term) ||
        (row.shipment.carrier_name ?? '').toLowerCase().includes(term) ||
        row.bols.some(b => b.bol_number.toLowerCase().includes(term)) ||
        row.bols.some(b => (b.driver_email ?? '').toLowerCase().includes(term))
      );
    }

    if (this.statusFilter !== 'all') {
      list = list.filter(row => row.overallStatus === this.statusFilter);
    }

    return list;
  }

  ngOnInit(): void {
    this.load();
    this.subscribeToChanges();
    this.pollInterval = setInterval(() => void this.load(), 5000);
    if (this.route.snapshot.queryParamMap.get('uploaded') === '1') {
      this.showUploadSuccess.set(true);
      this.router.navigate([], { queryParams: {}, replaceUrl: true });
    }
  }

  ngOnDestroy(): void {
    if (this.channel) supabase.removeChannel(this.channel);
    if (this.pollInterval) clearInterval(this.pollInterval);
  }

  refresh(): void { void this.load(); }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const bols = await this.bolsService.list();
      this.shipmentRows.set(this.groupByShipment(bols));
    } finally {
      this.loading.set(false);
    }
  }

  private groupByShipment(bols: BolWithRelations[]): ShipmentRow[] {
    const map = new Map<string, ShipmentRow>();

    for (const bol of bols) {
      if (!bol.shipment) continue;
      const sid = bol.shipment_id;

      if (!map.has(sid)) {
        map.set(sid, {
          id: sid,
          shipment: bol.shipment,
          bols: [],
          stopCount: 0,
          bolCount: 0,
          driverSignedCount: 0,
          consigneeSignedCount: 0,
          overallStatus: 'pending',
          createdAt: bol.shipment.created_at,
        });
      }

      const row = map.get(sid)!;
      row.bols.push(bol);
      row.bolCount++;
      if (bol.signatures.some(s => s.signer_type === 'driver'))    row.driverSignedCount++;
      if (bol.signatures.some(s => s.signer_type === 'consignee')) row.consigneeSignedCount++;
    }

    for (const row of map.values()) {
      row.stopCount = new Set(row.bols.map(b => b.stop_id).filter(Boolean)).size || 1;
      row.overallStatus = this.deriveStatus(row.bols);
      // Sort BOLs by stop_sequence
      row.bols.sort((a, b) => (a.stop_sequence ?? 0) - (b.stop_sequence ?? 0));
    }

    return Array.from(map.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  private deriveStatus(bols: BolWithRelations[]): Exclude<BolStatus, 'all'> {
    const order: Exclude<BolStatus, 'all'>[] = ['pending', 'claimed', 'driver_signed', 'consignee_signed', 'completed'];
    // Overall status = max status across all BOLs (furthest along)
    let max = 0;
    for (const bol of bols) {
      const idx = order.indexOf(bol.status as Exclude<BolStatus, 'all'>);
      if (idx > max) max = idx;
    }
    return order[max];
  }

  private subscribeToChanges(): void {
    this.channel = supabase
      .channel('ebol-live')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bols' },      () => void this.load())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'shipments' }, () => void this.load())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'signatures' }, () => void this.load())
      .subscribe();
  }

  toggleRow(id: string): void {
    if (this.expandedRows[id]) {
      const { [id]: _, ...rest } = this.expandedRows;
      this.expandedRows = rest;
    } else {
      this.expandedRows = { ...this.expandedRows, [id]: true };
    }
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.statusFilter = 'all';
  }

  goToShipment(row: ShipmentRow): void {
    const firstBolId = row.bols[0]?.id;
    this.router.navigate(
      ['/shipments', row.id],
      firstBolId ? { queryParams: { bol: firstBolId } } : {},
    );
  }

  goToBolInShipment(bol: BolWithRelations): void {
    this.router.navigate(['/shipments', bol.shipment_id], { queryParams: { bol: bol.id } });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  getSignature(bol: BolWithRelations, type: 'driver' | 'consignee') {
    return bol.signatures.find(s => s.signer_type === type) ?? null;
  }

  getPips(signed: number, total: number): ('filled' | 'empty')[] {
    return Array.from({ length: Math.min(total, 5) }, (_, i) => i < signed ? 'filled' : 'empty');
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      pending: 'Awaiting Driver',
      claimed: 'Driver Claimed',
      driver_signed: 'Driver Signed',
      consignee_signed: 'Consignee Signed',
      completed: 'Completed',
    };
    return map[status] ?? status;
  }

  statusSeverity(status: string): 'secondary' | 'info' | 'warn' | 'success' | 'danger' {
    const map: Record<string, 'secondary' | 'info' | 'warn' | 'success' | 'danger'> = {
      pending: 'secondary',
      claimed: 'info',
      driver_signed: 'warn',
      consignee_signed: 'success',
      completed: 'success',
    };
    return map[status] ?? 'secondary';
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  /** Show time only for entries created within the last 7 days */
  isRecent(iso: string): boolean {
    return (Date.now() - new Date(iso).getTime()) < 7 * 24 * 60 * 60 * 1000;
  }
}
