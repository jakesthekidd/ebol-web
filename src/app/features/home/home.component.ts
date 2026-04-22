import {
  afterNextRender,
  Component,
  ElementRef,
  inject,
  NgZone,
  OnDestroy,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePickerModule } from 'primeng/datepicker';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import * as L from 'leaflet';
import { fromEvent, Subscription } from 'rxjs';

const PICKUP_DEMO: L.LatLngExpression[] = [
  [40.76, -111.89],
  [39.95, -75.17],
  [27.66, -81.52],
];

const DELIVERY_DEMO: L.LatLngExpression[] = [
  [37.77, -122.42],
  [35.78, -78.64],
];

function defaultDateRange(): Date[] {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 12);
  end.setDate(end.getDate() + 6);
  return [start, end];
}

@Component({
  selector: 'ebol-home',
  imports: [FormsModule, DatePickerModule, ButtonModule, CheckboxModule],
  host: { class: 'home-host' },
  styles: [
    `
      :host {
        display: flex;
        flex: 1;
        min-height: 0;
        width: 100%;
      }
      .layout {
        display: flex;
        flex: 1;
        min-height: 0;
        width: 100%;
      }
      .filters {
        width: 280px;
        flex-shrink: 0;
        background: var(--p-surface-0);
        border-right: 1px solid var(--p-surface-200);
        padding: 1.25rem 1rem;
        overflow-y: auto;
      }
      .filter-label {
        display: block;
        font-size: 12px;
        font-weight: 600;
        color: var(--p-text-color);
        margin-bottom: 0.35rem;
      }
      .field {
        margin-bottom: 1rem;
      }
      .field :deep(.p-datepicker) {
        width: 100%;
      }
      .field :deep(.p-inputtext) {
        width: 100%;
      }
      .apply-btn {
        width: 100%;
        margin-top: 0.25rem;
      }
      .reset-link {
        display: block;
        margin-top: 0.65rem;
        text-align: center;
        font-size: 12px;
        font-weight: 600;
        color: var(--p-primary-600);
        cursor: pointer;
        text-decoration: none;
        background: none;
        border: none;
        padding: 0;
        font-family: inherit;
      }
      .reset-link:hover {
        text-decoration: underline;
      }
      .legend {
        margin-top: 1.75rem;
        padding-top: 1.25rem;
        border-top: 1px solid var(--p-surface-200);
      }
      .legend-pins {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin-bottom: 0.75rem;
      }
      .pin {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        border: 2px solid #fff;
        box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.15);
      }
      .pin-pickup {
        background: #00bf30;
      }
      .pin-delivery {
        background: #2474bb;
      }
      .layer-row {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.5rem;
      }
      .layer-row label {
        font-size: 13px;
        cursor: pointer;
      }
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
      .last-updated {
        position: absolute;
        top: 12px;
        left: 52px;
        z-index: 400;
        padding: 0.35rem 0.65rem;
        font-size: 11px;
        font-weight: 500;
        color: #334155;
        background: rgba(255, 255, 255, 0.88);
        border-radius: 999px;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
        pointer-events: none;
      }
      .osm-attribution {
        position: absolute;
        right: 8px;
        bottom: 4px;
        z-index: 400;
        font-size: 10px;
        color: #64748b;
        background: rgba(255, 255, 255, 0.85);
        padding: 2px 6px;
        border-radius: 4px;
        pointer-events: auto;
      }
      .osm-attribution a {
        color: var(--p-primary-600);
      }
    `,
  ],
  template: `
    <div class="layout">
      <aside class="filters">
        <div class="field">
          <span class="filter-label">Shipping date</span>
          <p-datepicker
            [(ngModel)]="shippingRange"
            selectionMode="range"
            [readonlyInput]="true"
            [showIcon]="true"
            dateFormat="mm/dd/yy"
            [style]="{ width: '100%' }"
            inputStyleClass="w-full"
          />
        </div>
        <div class="field">
          <span class="filter-label">Delivery date</span>
          <p-datepicker
            [(ngModel)]="deliveryRange"
            selectionMode="range"
            [readonlyInput]="true"
            [showIcon]="true"
            dateFormat="mm/dd/yy"
            [style]="{ width: '100%' }"
            inputStyleClass="w-full"
          />
        </div>
        <p-button label="Apply" severity="success" styleClass="apply-btn" (onClick)="onApply()" />
        <button type="button" class="reset-link" (click)="onResetDates()">Reset dates</button>

        <div class="legend">
          <div class="legend-pins">
            <span class="pin pin-pickup" aria-hidden="true"></span>
            <span class="pin pin-delivery" aria-hidden="true"></span>
          </div>
          <div class="layer-row">
            <p-checkbox inputId="show-pickup" [(ngModel)]="showPickup" [binary]="true" (ngModelChange)="onToggleLayers()" />
            <label for="show-pickup">Show pickup locations</label>
          </div>
          <div class="layer-row">
            <p-checkbox inputId="show-delivery" [(ngModel)]="showDelivery" [binary]="true" (ngModelChange)="onToggleLayers()" />
            <label for="show-delivery">Show delivery locations</label>
          </div>
        </div>
      </aside>

      <div class="map-wrap">
        <div class="map-el" #mapContainer></div>
        <div class="last-updated">Last updated {{ lastUpdatedText() }}</div>
        <div class="osm-attribution">
          ©
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>
        </div>
      </div>
    </div>
  `,
})
export class HomeComponent implements OnDestroy {
  private zone = inject(NgZone);
  private mapContainer = viewChild.required<ElementRef<HTMLElement>>('mapContainer');

  shippingRange: Date[] | null = defaultDateRange();
  deliveryRange: Date[] | null = defaultDateRange();
  showPickup = true;
  showDelivery = true;

  lastUpdatedText = signal(this.formatNow());

  private map: L.Map | null = null;
  private pickupLayer = L.layerGroup();
  private deliveryLayer = L.layerGroup();
  private resizeSub: Subscription | null = null;

  constructor() {
    afterNextRender(() => this.initMap());
  }

  ngOnDestroy(): void {
    this.resizeSub?.unsubscribe();
    this.resizeSub = null;
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  onApply(): void {
    this.touchLastUpdated();
    this.map?.invalidateSize();
  }

  onResetDates(): void {
    const r = defaultDateRange();
    this.shippingRange = [...r];
    this.deliveryRange = [...r];
    this.touchLastUpdated();
  }

  onToggleLayers(): void {
    if (!this.map) return;
    if (this.showPickup) {
      if (!this.map.hasLayer(this.pickupLayer)) this.pickupLayer.addTo(this.map);
    } else {
      this.map.removeLayer(this.pickupLayer);
    }
    if (this.showDelivery) {
      if (!this.map.hasLayer(this.deliveryLayer)) this.deliveryLayer.addTo(this.map);
    } else {
      this.map.removeLayer(this.deliveryLayer);
    }
  }

  private touchLastUpdated(): void {
    this.lastUpdatedText.set(this.formatNow());
  }

  private formatNow(): string {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'medium',
    }).format(new Date());
  }

  private initMap(): void {
    const el = this.mapContainer().nativeElement;
    this.zone.runOutsideAngular(() => {
      const map = L.map(el, { zoomControl: true }).setView([39.8283, -98.5795], 4);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '',
      }).addTo(map);

      const pickupStyle: L.CircleMarkerOptions = {
        radius: 8,
        fillColor: '#00bf30',
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.9,
      };
      const deliveryStyle: L.CircleMarkerOptions = {
        radius: 8,
        fillColor: '#2474bb',
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.9,
      };

      for (const ll of PICKUP_DEMO) {
        L.circleMarker(ll, pickupStyle).addTo(this.pickupLayer);
      }
      for (const ll of DELIVERY_DEMO) {
        L.circleMarker(ll, deliveryStyle).addTo(this.deliveryLayer);
      }

      if (this.showPickup) this.pickupLayer.addTo(map);
      if (this.showDelivery) this.deliveryLayer.addTo(map);

      this.map = map;

      this.resizeSub = fromEvent(window, 'resize').subscribe(() => {
        map.invalidateSize();
      });

      setTimeout(() => map.invalidateSize(), 0);
    });

    this.touchLastUpdated();
  }
}
