export const MOCK_SHIPMENT = {
  shipment_id: 'SHP-2024-00842',
  shipper_name: 'Acme Foods LLC',
  shipper_address: '1400 Industrial Blvd, Chicago IL 60601',
  consignee_name: 'Target DC #42',
  consignee_address: '800 Distribution Way, Memphis TN 38101',
  pickup_date: '2024-03-15',
  total_weight: 1840,
  piece_count: 24,
  carrier_name: 'Swift Transport',
  commodity_desc: 'Frozen Foods — Class 60',
  pro_number: 'PRO-998821',
  declared_value: 12400,
} as const;

export type MockShipmentKey = keyof typeof MOCK_SHIPMENT;
