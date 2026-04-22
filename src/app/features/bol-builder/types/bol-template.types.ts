import type { MockShipmentKey } from '../mock/mock-shipment';

export interface FieldMapping {
  fieldId: string;
  label: string;
  apiKey?: MockShipmentKey;    // undefined when driverInput is true
  format: 'text' | 'date' | 'currency' | 'number';
  required: boolean;
  fallback: string;
  driverInput?: boolean;
}

export interface BOLTemplate {
  id: string;
  name: string;
  status: 'draft' | 'published';
  mappings: FieldMapping[];
  createdAt: string;
  logoDataUrl?: string;
}

export interface BolSlotDef {
  fieldId: string;
  defaultLabel: string;
  section: 'header' | 'shipper' | 'consignee' | 'commodity';
  defaultRequired: boolean;
}

export const BOL_SLOTS: BolSlotDef[] = [
  { fieldId: 'bol_number',        defaultLabel: 'BOL NUMBER',   section: 'header',    defaultRequired: true  },
  { fieldId: 'pickup_date',       defaultLabel: 'PICKUP DATE',  section: 'header',    defaultRequired: true  },
  { fieldId: 'shipper_name',      defaultLabel: 'SHIPPER',      section: 'shipper',   defaultRequired: true  },
  { fieldId: 'shipper_address',   defaultLabel: 'ADDRESS',      section: 'shipper',   defaultRequired: false },
  { fieldId: 'consignee_name',    defaultLabel: 'CONSIGNEE',    section: 'consignee', defaultRequired: true  },
  { fieldId: 'consignee_address', defaultLabel: 'ADDRESS',      section: 'consignee', defaultRequired: false },
  { fieldId: 'commodity_desc',    defaultLabel: 'COMMODITY',    section: 'commodity', defaultRequired: true  },
  { fieldId: 'piece_count',       defaultLabel: 'PIECES',       section: 'commodity', defaultRequired: false },
  { fieldId: 'total_weight',      defaultLabel: 'WEIGHT',       section: 'commodity', defaultRequired: true  },
];
