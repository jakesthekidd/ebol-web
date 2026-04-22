import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { TimelineModule } from 'primeng/timeline';
import { DividerModule } from 'primeng/divider';
import { SkeletonModule } from 'primeng/skeleton';
import { AvatarModule } from 'primeng/avatar';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { BolsService, type BolWithRelations, type Signature } from '../bols.service';
import { supabase } from '../../../lib/supabase/client';

interface TimelineEvent {
  status: string;
  date: string | null;
  icon: string;
  color: string;
  label: string;
}

@Component({
  selector: 'ebol-bol-detail',
  imports: [RouterLink, TitleCasePipe, ButtonModule, CardModule, TagModule, TimelineModule, DividerModule, SkeletonModule, AvatarModule],
  styles: [
    `
      .page {
        padding: 2rem;
        max-width: 800px;
      }
      .back-link {
        display: inline-flex;
        align-items: center;
        gap: 0.375rem;
        font-size: 13px;
        color: var(--p-text-muted-color);
        text-decoration: none;
        margin-bottom: 1.25rem;
        transition: color 0.15s;
      }
      .back-link:hover { color: var(--p-primary-500); }
      .page-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        margin-bottom: 1.5rem;
        gap: 1rem;
      }
      .page-title {
        font-size: 1.25rem;
        font-weight: 700;
        color: var(--p-text-color);
        margin: 0 0 0.375rem;
      }
      .page-sub {
        font-size: 13px;
        color: var(--p-text-muted-color);
        margin: 0;
      }
      .meta-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 1rem;
        margin-bottom: 1.5rem;
      }
      .meta-item label {
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: var(--p-text-muted-color);
        display: block;
        margin-bottom: 0.25rem;
      }
      .meta-item .value {
        font-size: 14px;
        font-weight: 500;
        color: var(--p-text-color);
      }
      .meta-item .value.muted {
        color: var(--p-text-muted-color);
        font-weight: 400;
      }
      .section-heading {
        font-size: 13px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.6px;
        color: var(--p-text-muted-color);
        margin-bottom: 1rem;
      }
      .signature-card {
        display: flex;
        align-items: center;
        gap: 0.875rem;
        padding: 0.875rem;
        border: 1px solid var(--p-surface-200);
        border-radius: 8px;
        margin-bottom: 0.5rem;
        background: var(--p-surface-0);
      }
      .sig-info .sig-name {
        font-size: 14px;
        font-weight: 600;
        color: var(--p-text-color);
      }
      .sig-info .sig-meta {
        font-size: 12px;
        color: var(--p-text-muted-color);
        margin-top: 0.125rem;
      }
      .sig-image {
        width: 120px;
        height: 48px;
        object-fit: contain;
        border: 1px solid var(--p-surface-200);
        border-radius: 4px;
        background: #fff;
        margin-left: auto;
      }
      .not-found {
        text-align: center;
        padding: 4rem 1rem;
        color: var(--p-text-muted-color);
      }
      .not-found i {
        font-size: 3rem;
        opacity: 0.3;
        margin-bottom: 1rem;
      }
    `,
  ],
  template: `
    <div class="page">
      <a class="back-link" routerLink="/repository">
        <i class="pi pi-arrow-left"></i>
        Back to repository
      </a>

      @if (loading()) {
        <div style="padding: 2rem 0;">
          <p-skeleton height="2rem" width="40%" styleClass="mb-3" />
          <p-skeleton height="1rem" width="60%" styleClass="mb-4" />
          <p-skeleton height="200px" />
        </div>
      } @else if (!bol()) {
        <div class="not-found">
          <i class="pi pi-file-excel"></i>
          <p>BOL not found or you don't have access.</p>
          <p-button label="Back to repository" routerLink="/repository" [text]="true" />
        </div>
      } @else {
        <!-- Header -->
        <div class="page-header">
          <div>
            <h1 class="page-title">BOL {{ bol()!.bol_number }}</h1>
            <p class="page-sub">
              Shipment {{ bol()!.shipment?.shipment_number ?? '—' }}
              @if (bol()!.shipment?.carrier_name) {
                · {{ bol()!.shipment!.carrier_name }}
              }
            </p>
          </div>
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <p-tag [value]="statusLabel(bol()!.status)" [severity]="statusSeverity(bol()!.status)" />
            @if (bol()!.pdf_url) {
              <p-button
                label="Open PDF"
                icon="pi pi-external-link"
                severity="secondary"
                [outlined]="true"
                size="small"
                (click)="openPdf()"
              />
              <p-button
                label="Download"
                icon="pi pi-download"
                size="small"
                (click)="downloadPdf()"
              />
            }
          </div>
        </div>

        <!-- Metadata grid -->
        <p-card styleClass="mb-4">
          <div class="meta-grid">
            <div class="meta-item">
              <label>BOL Number</label>
              <div class="value">{{ bol()!.bol_number }}</div>
            </div>
            <div class="meta-item">
              <label>Stop Sequence</label>
              <div class="value">{{ bol()!.stop_sequence ?? '—' }}</div>
            </div>
            <div class="meta-item">
              <label>Driver Email</label>
              <div class="value" [class.muted]="!bol()!.driver_email">
                {{ bol()!.driver_email ?? 'Not assigned' }}
              </div>
            </div>
            <div class="meta-item">
              <label>Pages</label>
              <div class="value">{{ bol()!.page_count ?? '—' }}</div>
            </div>
            <div class="meta-item">
              <label>Pickup</label>
              <div class="value" [class.muted]="!bol()!.pickup_location">
                {{ bol()!.pickup_location?.name ?? 'Not set' }}
              </div>
            </div>
            <div class="meta-item">
              <label>Drop-off</label>
              <div class="value" [class.muted]="!bol()!.dropoff_location">
                {{ bol()!.dropoff_location?.name ?? 'Not set' }}
              </div>
            </div>
            <div class="meta-item">
              <label>Uploaded</label>
              <div class="value">{{ formatDate(bol()!.created_at) }}</div>
            </div>
            <div class="meta-item">
              <label>Last updated</label>
              <div class="value">{{ formatDate(bol()!.updated_at) }}</div>
            </div>
          </div>
        </p-card>

        <!-- Status timeline -->
        <p-card styleClass="mb-4">
          <div class="section-heading">Status timeline</div>
          <p-timeline [value]="timelineEvents()" layout="horizontal" align="bottom">
            <ng-template pTemplate="marker" let-event>
              <span
                class="pi {{ event.icon }}"
                [style]="{
                  color: event.active ? event.color : 'var(--p-surface-400)',
                  fontSize: '16px',
                  background: event.active ? event.bgColor : 'var(--p-surface-100)',
                  borderRadius: '50%',
                  padding: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                }"
              ></span>
            </ng-template>
            <ng-template pTemplate="content" let-event>
              <div style="font-size: 12px; font-weight: 600; color: var(--p-text-color);">
                {{ event.label }}
              </div>
              @if (event.date) {
                <div style="font-size: 11px; color: var(--p-text-muted-color); margin-top: 2px;">
                  {{ event.date }}
                </div>
              }
            </ng-template>
          </p-timeline>
        </p-card>

        <!-- Signatures -->
        @if (bol()!.signatures.length > 0) {
          <p-card>
            <div class="section-heading">Signatures ({{ bol()!.signatures.length }})</div>
            @for (sig of bol()!.signatures; track sig.id) {
              <div class="signature-card">
                <p-avatar
                  [label]="sig.signer_name.substring(0, 2).toUpperCase()"
                  shape="circle"
                  [style]="{ background: 'var(--p-primary-100)', color: 'var(--p-primary-700)' }"
                />
                <div class="sig-info">
                  <div class="sig-name">{{ sig.signer_name }}</div>
                  <div class="sig-meta">
                    {{ sig.signer_type | titlecase }} · {{ formatDate(sig.signed_at) }}
                  </div>
                </div>
                @if (sig.signature_image_url) {
                  <img [src]="sig.signature_image_url" alt="Signature" class="sig-image" />
                }
              </div>
            }
          </p-card>
        } @else {
          <p-card>
            <div class="section-heading">Signatures</div>
            <div style="text-align: center; padding: 1.5rem; color: var(--p-text-muted-color); font-size: 13px;">
              <i class="pi pi-pen-to-square" style="font-size: 1.5rem; display: block; margin-bottom: 0.5rem; opacity: 0.4;"></i>
              No signatures yet
            </div>
          </p-card>
        }
      }
    </div>
  `,
})
export class BolDetailComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private bolsService = inject(BolsService);
  private router = inject(Router);

  bol = signal<BolWithRelations | null>(null);
  loading = signal(true);

  private channel: RealtimeChannel | null = null;

  private readonly STATUS_ORDER = ['pending', 'claimed', 'driver_signed', 'consignee_signed', 'completed'];

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.load(id);
    this.subscribeToChanges(id);
  }

  ngOnDestroy(): void {
    if (this.channel) supabase.removeChannel(this.channel);
  }

  private async load(id: string): Promise<void> {
    this.loading.set(true);
    try {
      this.bol.set(await this.bolsService.getById(id));
    } finally {
      this.loading.set(false);
    }
  }

  private subscribeToChanges(id: string): void {
    this.channel = supabase
      .channel(`bol-detail-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bols', filter: `id=eq.${id}` }, () => {
        this.load(id);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'signatures', filter: `bol_id=eq.${id}` }, () => {
        this.load(id);
      })
      .subscribe();
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      pending: 'Pending',
      claimed: 'Claimed',
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
      consignee_signed: 'warn',
      completed: 'success',
    };
    return map[status] ?? 'secondary';
  }

  timelineEvents() {
    const currentBol = this.bol();
    if (!currentBol) return [];

    const currentIdx = this.STATUS_ORDER.indexOf(currentBol.status);
    const sigs = currentBol.signatures;

    const getSignatureDate = (type: 'driver' | 'consignee'): string | null => {
      const sig = sigs.find((s: Signature) => s.signer_type === type);
      return sig ? this.formatDate(sig.signed_at) : null;
    };

    return [
      { label: 'Uploaded', icon: 'pi-upload', color: '#2474BB', bgColor: '#D3E3F1', active: currentIdx >= 0, date: this.formatDate(currentBol.created_at) },
      { label: 'Claimed', icon: 'pi-user-plus', color: '#2474BB', bgColor: '#D3E3F1', active: currentIdx >= 1, date: null },
      { label: 'Driver Signed', icon: 'pi-truck', color: '#FFA300', bgColor: '#FFEDCC', active: currentIdx >= 2, date: getSignatureDate('driver') },
      { label: 'Consignee Signed', icon: 'pi-building', color: '#FFA300', bgColor: '#FFEDCC', active: currentIdx >= 3, date: getSignatureDate('consignee') },
      { label: 'Completed', icon: 'pi-check-circle', color: '#00BF30', bgColor: '#CCF2D6', active: currentIdx >= 4, date: null },
    ];
  }

  formatDate(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  openPdf(): void {
    const url = this.bol()?.pdf_url;
    if (url) window.open(url, '_blank');
  }

  downloadPdf(): void {
    const url = this.bol()?.pdf_url;
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = `BOL-${this.bol()!.bol_number}.pdf`;
    a.click();
  }
}
