import { Injectable } from '@angular/core';
import { supabase } from '../../lib/supabase/client';
import type { Tables, TablesInsert } from '../../lib/supabase/database.types';

export type Bol = Tables<'bols'>;
export type Shipment = Tables<'shipments'>;
export type Stop = Tables<'stops'>;
export type Signature = Tables<'signatures'>;

export interface BolWithRelations extends Bol {
  shipment: Shipment | null;
  stop: Stop | null;
  signatures: Signature[];
  pickup_location: Tables<'locations'> | null;
  dropoff_location: Tables<'locations'> | null;
  /** Driver-placed field values (seal_number, arrival_time, package_weight).
   *  Written by the mobile app when the driver confirms signing. */
  form_data: Record<string, string> | null;
}

export interface StopDraft {
  stopName: string;
  bolNumber: string;
  sequence: number;
}

export interface UploadBolPayload {
  // Shipment fields
  shipmentNumber: string;
  carrierName: string;
  scacCode: string;
  carrierDot: string;
  pickupLocationId: string | null;
  multiStop: boolean;
  // Stops
  stops: StopDraft[];
  // File
  file: File;
}

@Injectable({ providedIn: 'root' })
export class BolsService {

  async uploadBol(payload: UploadBolPayload): Promise<Bol> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // 1. Upload file to storage
    const firstBolNum = payload.stops[0]?.bolNumber || 'unknown';
    const fileName = `${payload.shipmentNumber}/${firstBolNum}.pdf`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('bol-documents')
      .upload(fileName, payload.file, { contentType: payload.file.type, upsert: false });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('bol-documents')
      .getPublicUrl(uploadData.path);

    // 2. Create shipment (draft)
    const { data: shipment, error: shipmentError } = await supabase
      .from('shipments')
      .insert({
        shipment_number: payload.shipmentNumber,
        shipper_id: user.id,
        carrier_name: payload.carrierName || null,
        scac_code: payload.scacCode || null,
        carrier_dot: payload.carrierDot || null,
        status: 'pending',
      })
      .select()
      .single();

    if (shipmentError) throw shipmentError;

    // 3. Create stops + bols
    let firstBol: Bol | null = null;

    for (const [i, stopDraft] of payload.stops.entries()) {
      const { data: stop, error: stopError } = await supabase
        .from('stops')
        .insert({
          shipment_id: shipment.id,
          stop_name: stopDraft.stopName,
          bol_number: stopDraft.bolNumber || null,
          sequence: i + 1,
          pickup_location_id: i === 0 ? payload.pickupLocationId : null,
        })
        .select()
        .single();

      if (stopError) throw stopError;

      const bolInsert: TablesInsert<'bols'> = {
        shipment_id: shipment.id,
        stop_id: stop.id,
        bol_number: stopDraft.bolNumber || `${payload.shipmentNumber}-${i + 1}`,
        pdf_url: publicUrl,
        status: 'pending',
        stop_sequence: i + 1,
        pickup_location_id: i === 0 ? payload.pickupLocationId : null,
        // AI extraction hook — populated by extract-bol Edge Function in future
        raw_extraction: null,
        parsed_extraction: null,
      };

      const { data: bol, error: bolError } = await supabase
        .from('bols')
        .insert(bolInsert)
        .select()
        .single();

      if (bolError) throw bolError;
      if (i === 0) firstBol = bol;
    }

    // 4. [AI HOOK] Call extract-bol Edge Function (stub — no-op until OpenAI key is configured)
    try {
      await supabase.functions.invoke('extract-bol', {
        body: { filePath: uploadData.path, shipmentId: shipment.id },
      });
    } catch {
      // Non-blocking — extraction is best-effort for now
    }

    return firstBol!;
  }

  async list(): Promise<BolWithRelations[]> {
    const { data, error } = await supabase
      .from('bols')
      .select(`
        *,
        shipment:shipments(*),
        stop:stops(*),
        signatures(*),
        pickup_location:locations!bols_pickup_location_id_fkey(*),
        dropoff_location:locations!bols_dropoff_location_id_fkey(*)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as unknown as BolWithRelations[];
  }

  async getById(id: string): Promise<BolWithRelations | null> {
    const { data, error } = await supabase
      .from('bols')
      .select(`
        *,
        shipment:shipments(*),
        stop:stops(*),
        signatures(*),
        pickup_location:locations!bols_pickup_location_id_fkey(*),
        dropoff_location:locations!bols_dropoff_location_id_fkey(*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data as unknown as BolWithRelations;
  }

  async getPdfDownloadUrl(pdfUrl: string): Promise<string> {
    if (pdfUrl.startsWith('http')) return pdfUrl;
    const { data, error } = await supabase.storage
      .from('bol-documents')
      .createSignedUrl(pdfUrl, 3600);
    if (error) throw error;
    return data.signedUrl;
  }

  async getByShipmentId(shipmentId: string): Promise<BolWithRelations[]> {
    const { data, error } = await supabase
      .from('bols')
      .select(`
        *,
        shipment:shipments(*),
        stop:stops(*),
        signatures(*),
        pickup_location:locations!bols_pickup_location_id_fkey(*),
        dropoff_location:locations!bols_dropoff_location_id_fkey(*)
      `)
      .eq('shipment_id', shipmentId)
      .order('stop_sequence', { ascending: true });

    if (error) throw error;
    return (data ?? []) as unknown as BolWithRelations[];
  }

  /**
   * Demo upload: creates shipment → stop → N bols (one per file).
   * Pickup location is always TRANSFLO ATLANTA DEPOT.
   * bolNumber for each file is exactly what the shipper typed — no generation.
   */
  async createShipmentWithBols(
    shipmentNumber: string,
    carrierName: string,
    entries: { file: File; bolNumber: string }[],
  ): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const PICKUP_LOCATION_ID = 'f1a00000-0000-0000-0000-000000000001';

    // a) Upload each PDF to storage at {shipmentNumber}/{bolNumber}.pdf
    const pdfUrls: string[] = [];
    for (const entry of entries) {
      const path = `${shipmentNumber}/${entry.bolNumber}.pdf`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('bol-documents')
        .upload(path, entry.file, { contentType: 'application/pdf', upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage
        .from('bol-documents').getPublicUrl(uploadData.path);
      pdfUrls.push(publicUrl);
    }

    // b) Insert shipment row
    const { data: shipment, error: shipmentError } = await supabase
      .from('shipments')
      .insert({
        shipment_number: shipmentNumber,
        carrier_name: carrierName || null,
        shipper_id: user.id,
        status: 'pending',
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (shipmentError) throw shipmentError;

    // c) Insert stop row — mandatory for mobile driver search
    const { data: stop, error: stopError } = await supabase
      .from('stops')
      .insert({
        shipment_id: shipment.id,
        pickup_location_id: PICKUP_LOCATION_ID,
        stop_name: 'TRANSFLO ATLANTA DEPOT',
        sequence: 1,
      })
      .select()
      .single();
    if (stopError) throw stopError;

    // d) Insert one BOL row per uploaded PDF — bol_number is exactly what the shipper entered
    for (let i = 0; i < entries.length; i++) {
      const { error: bolError } = await supabase.from('bols').insert({
        bol_number: entries[i].bolNumber,
        shipment_id: shipment.id,
        stop_id: stop.id,
        page_count: 1,
        status: 'pending',
        pdf_url: pdfUrls[i],
        stop_sequence: i + 1,
        updated_at: new Date().toISOString(),
      });
      if (bolError) throw bolError;
    }

    return shipment.id;
  }

  async addSignature(
    bolId: string,
    signerType: 'driver' | 'consignee',
    signerName: string,
    dataUrl: string,
  ): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();

    // Convert data URL to blob and upload to signatures bucket
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const fileName = `${bolId}/${signerType}-${Date.now()}.png`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('signatures')
      .upload(fileName, blob, { contentType: 'image/png', upsert: false });
    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('signatures')
      .getPublicUrl(uploadData.path);

    // Insert signature record
    const { error: sigError } = await supabase.from('signatures').insert({
      bol_id: bolId,
      signer_id: user?.id ?? null,
      signer_type: signerType,
      signer_name: signerName,
      signature_image_url: publicUrl,
    });
    if (sigError) throw sigError;

    // Determine new status — complete when both sides are signed
    const { data: bolData } = await supabase
      .from('bols').select('status').eq('id', bolId).single();
    const current = bolData?.status ?? 'pending';

    let newStatus: 'driver_signed' | 'consignee_signed' | 'completed';
    if (signerType === 'driver') {
      newStatus = current === 'consignee_signed' ? 'completed' : 'driver_signed';
    } else {
      newStatus = current === 'driver_signed' ? 'completed' : 'consignee_signed';
    }

    const { error: bolError } = await supabase
      .from('bols').update({ status: newStatus }).eq('id', bolId);
    if (bolError) throw bolError;
  }
}
