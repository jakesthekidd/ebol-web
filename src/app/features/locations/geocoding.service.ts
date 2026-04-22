import { isDevMode, Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, firstValueFrom, map, of } from 'rxjs';

/** Nominatim search result (subset). */
interface NominatimHit {
  lat: string;
  lon: string;
}

/**
 * Forward geocoding via OpenStreetMap Nominatim.
 * Dev: uses Angular dev-server proxy (/nominatim) to avoid browser CORS issues.
 * Prod: calls nominatim.openstreetmap.org directly (Nominatim allows browser GET for light use).
 */
@Injectable({ providedIn: 'root' })
export class GeocodingService {
  private http = inject(HttpClient);

  private readonly base = isDevMode() ? '/nominatim' : 'https://nominatim.openstreetmap.org';

  /**
   * Returns WGS84 coordinates or null if not found / request failed.
   */
  async geocodeAddress(address: string, city: string, state: string, zip: string): Promise<{ lat: number; lng: number } | null> {
    const q = [address, city, state, zip].filter((s) => s?.trim()).join(', ');
    if (!q.trim()) return null;

    const params = new HttpParams().set('format', 'json').set('q', q).set('limit', '1');

    const req$ = this.http.get<NominatimHit[]>(`${this.base}/search`, { params }).pipe(
      map((hits) => {
        const h = hits?.[0];
        if (!h) return null;
        const lat = Number.parseFloat(h.lat);
        const lng = Number.parseFloat(h.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        return { lat, lng };
      }),
      catchError(() => of(null)),
    );

    return firstValueFrom(req$);
  }
}
