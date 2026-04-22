import { Injectable } from '@angular/core';
import { supabase } from '../../lib/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '../../lib/supabase/database.types';

export type Location = Tables<'locations'>;
export type LocationInsert = Omit<TablesInsert<'locations'>, 'shipper_id'>;
export type LocationUpdate = TablesUpdate<'locations'>;

/** Columns always expected on `public.locations`. */
const BASE_SELECT = 'id, shipper_id, division, name, description, address, city, state, zip, country, geofence_radius, contact_name, contact_phone, contact_email, created_at, updated_at';

@Injectable({ providedIn: 'root' })
export class LocationsService {
  async list(): Promise<Location[]> {
    let { data, error } = await supabase.from('locations').select(`${BASE_SELECT}, latitude, longitude`);

    if (error && this.shouldRetryWithoutCoordColumns(error)) {
      ({ data, error } = await supabase.from('locations').select(BASE_SELECT));
    }

    if (error) throw error;

    const rows = (data ?? []).map((row) => this.normalizeLocation(row));
    rows.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    return rows;
  }

  async create(payload: LocationInsert): Promise<Location> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error('Not authenticated');

    const insertPayload = { ...payload, shipper_id: user.id };

    let { data, error } = await supabase.from('locations').insert(insertPayload).select().single();

    if (error && this.shouldRetryWithoutCoordColumns(error)) {
      const { latitude: _lat, longitude: _lng, ...rest } = insertPayload;
      ({ data, error } = await supabase.from('locations').insert(rest).select().single());
    }

    if (error) throw error;
    return this.normalizeLocation(data);
  }

  async update(id: string, payload: LocationUpdate): Promise<Location> {
    let { data, error } = await supabase.from('locations').update(payload).eq('id', id).select().single();

    if (error && this.shouldRetryWithoutCoordColumns(error)) {
      const { latitude: _lat, longitude: _lng, ...rest } = payload;
      ({ data, error } = await supabase.from('locations').update(rest).eq('id', id).select().single());
    }

    if (error) throw error;
    return this.normalizeLocation(data);
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('locations').delete().eq('id', id);
    if (error) throw error;
  }

  private normalizeLocation(row: unknown): Location {
    const r = row as Record<string, unknown>;
    return {
      ...r,
      division: (r['division'] as string | null | undefined) ?? null,
      description: (r['description'] as string | null | undefined) ?? null,
      country: (r['country'] as string | undefined) ?? 'United States',
      geofence_radius: (r['geofence_radius'] as number | undefined) ?? 0.5,
      latitude: (r['latitude'] as number | null | undefined) ?? null,
      longitude: (r['longitude'] as number | null | undefined) ?? null,
      contact_name: (r['contact_name'] as string | null | undefined) ?? null,
      contact_phone: (r['contact_phone'] as string | null | undefined) ?? null,
      contact_email: (r['contact_email'] as string | null | undefined) ?? null,
    } as Location;
  }

  private shouldRetryWithoutCoordColumns(error: { code: string; message: string; details: string }): boolean {
    return error.code === 'PGRST204';
  }
}
