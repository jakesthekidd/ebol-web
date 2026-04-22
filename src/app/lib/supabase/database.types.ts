export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          role: 'shipper' | 'driver' | 'consignee' | 'broker' | 'admin';
          company: string | null;
          phone: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          role?: 'shipper' | 'driver' | 'consignee' | 'broker' | 'admin';
          company?: string | null;
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          role?: 'shipper' | 'driver' | 'consignee' | 'broker' | 'admin';
          company?: string | null;
          phone?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      locations: {
        Row: {
          id: string;
          shipper_id: string;
          division: string | null;
          name: string;
          description: string | null;
          address: string;
          city: string;
          state: string;
          zip: string;
          country: string;
          latitude: number | null;
          longitude: number | null;
          geofence_radius: number;
          contact_name: string | null;
          contact_phone: string | null;
          contact_email: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          shipper_id: string;
          division?: string | null;
          name: string;
          description?: string | null;
          address: string;
          city: string;
          state: string;
          zip: string;
          country?: string;
          latitude?: number | null;
          longitude?: number | null;
          geofence_radius?: number;
          contact_name?: string | null;
          contact_phone?: string | null;
          contact_email?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          shipper_id?: string;
          division?: string | null;
          name?: string;
          description?: string | null;
          address?: string;
          city?: string;
          state?: string;
          zip?: string;
          country?: string;
          latitude?: number | null;
          longitude?: number | null;
          geofence_radius?: number;
          contact_name?: string | null;
          contact_phone?: string | null;
          contact_email?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'locations_shipper_id_fkey';
            columns: ['shipper_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      shipments: {
        Row: {
          id: string;
          shipment_number: string;
          shipper_id: string;
          driver_id: string | null;
          carrier_name: string | null;
          scac_code: string | null;
          carrier_dot: string | null;
          status: 'pending' | 'in_transit' | 'delivered';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          shipment_number: string;
          shipper_id: string;
          driver_id?: string | null;
          carrier_name?: string | null;
          scac_code?: string | null;
          carrier_dot?: string | null;
          status?: 'pending' | 'in_transit' | 'delivered';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          shipment_number?: string;
          shipper_id?: string;
          driver_id?: string | null;
          carrier_name?: string | null;
          scac_code?: string | null;
          carrier_dot?: string | null;
          status?: 'pending' | 'in_transit' | 'delivered';
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'shipments_shipper_id_fkey';
            columns: ['shipper_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      stops: {
        Row: {
          id: string;
          shipment_id: string;
          stop_name: string;
          bol_number: string | null;
          sequence: number;
          pickup_location_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          shipment_id: string;
          stop_name: string;
          bol_number?: string | null;
          sequence?: number;
          pickup_location_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          shipment_id?: string;
          stop_name?: string;
          bol_number?: string | null;
          sequence?: number;
          pickup_location_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'stops_shipment_id_fkey';
            columns: ['shipment_id'];
            isOneToOne: false;
            referencedRelation: 'shipments';
            referencedColumns: ['id'];
          },
        ];
      };
      bols: {
        Row: {
          id: string;
          shipment_id: string;
          stop_id: string | null;
          bol_number: string;
          pdf_url: string | null;
          status: 'pending' | 'claimed' | 'driver_signed' | 'consignee_signed' | 'completed';
          driver_email: string | null;
          stop_sequence: number | null;
          pickup_location_id: string | null;
          dropoff_location_id: string | null;
          page_count: number | null;
          raw_extraction: Record<string, unknown> | null;
          parsed_extraction: Record<string, unknown> | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          shipment_id: string;
          stop_id?: string | null;
          bol_number: string;
          pdf_url?: string | null;
          status?: 'pending' | 'claimed' | 'driver_signed' | 'consignee_signed' | 'completed';
          driver_email?: string | null;
          stop_sequence?: number | null;
          pickup_location_id?: string | null;
          dropoff_location_id?: string | null;
          page_count?: number | null;
          raw_extraction?: Record<string, unknown> | null;
          parsed_extraction?: Record<string, unknown> | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          shipment_id?: string;
          stop_id?: string | null;
          bol_number?: string;
          pdf_url?: string | null;
          status?: 'pending' | 'claimed' | 'driver_signed' | 'consignee_signed' | 'completed';
          driver_email?: string | null;
          stop_sequence?: number | null;
          pickup_location_id?: string | null;
          dropoff_location_id?: string | null;
          page_count?: number | null;
          raw_extraction?: Record<string, unknown> | null;
          parsed_extraction?: Record<string, unknown> | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'bols_shipment_id_fkey';
            columns: ['shipment_id'];
            isOneToOne: false;
            referencedRelation: 'shipments';
            referencedColumns: ['id'];
          },
        ];
      };
      signatures: {
        Row: {
          id: string;
          bol_id: string;
          signer_id: string | null;
          signer_type: 'driver' | 'consignee';
          signer_name: string;
          signature_image_url: string;
          signed_at: string;
        };
        Insert: {
          id?: string;
          bol_id: string;
          signer_id?: string | null;
          signer_type: 'driver' | 'consignee';
          signer_name: string;
          signature_image_url: string;
          signed_at?: string;
        };
        Update: {
          id?: string;
          bol_id?: string;
          signer_id?: string | null;
          signer_type?: 'driver' | 'consignee';
          signer_name?: string;
          signature_image_url?: string;
          signed_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'signatures_bol_id_fkey';
            columns: ['bol_id'];
            isOneToOne: false;
            referencedRelation: 'bols';
            referencedColumns: ['id'];
          },
        ];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          body: string;
          type: 'document_received' | 'document_signed' | 'bol_claimed' | 'bol_ol_id';
          bol_id: string | null;
          read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          body: string;
          type: 'document_received' | 'document_signed' | 'bol_claimed' | 'bol_ol_id';
          bol_id?: string | null;
          read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          body?: string;
          type?: 'document_received' | 'document_signed' | 'bol_claimed' | 'bol_ol_id';
          bol_id?: string | null;
          read?: boolean;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
