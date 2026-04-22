-- Run in Supabase SQL editor if not using CLI migrations.
alter table public.locations
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

comment on column public.locations.latitude is 'WGS84 latitude from geocoding; nullable until resolved';
comment on column public.locations.longitude is 'WGS84 longitude from geocoding; nullable until resolved';
