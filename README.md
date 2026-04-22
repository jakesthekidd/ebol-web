# EBOL Shipper Portal

Web application for shippers to manage locations, upload BOL PDFs, and track document status with live signature updates.

## Stack

| Layer | Technology |
|---|---|
| Framework | Angular 21 (standalone components) |
| UI | PrimeNG 21 + custom Transflo theme |
| Backend / DB | Supabase (Postgres + Auth + Storage + Realtime) |
| Language | TypeScript 5.9 (strict) |

## Prerequisites

- Node.js ≥ 18
- npm ≥ 9

## Setup

```bash
npm install
npm start        # dev server → http://localhost:4200
npm run build    # production build → dist/ebol-web
```

No `.env` file needed — Supabase credentials are baked into `src/environments/environment.ts` (anon key, safe for browser).

## Sign in (demo)

| Field | Value |
|---|---|
| Email | `shipper@demo.com` |
| Password | `demo1234` |

After sign-in you land on the **Repository** page.

---

## Architecture

### Supabase-only data layer

All data access goes through `@supabase/supabase-js` with the **anon key** (`src/app/lib/supabase/client.ts`). Row-Level Security on Postgres enforces that shippers only see their own rows. No custom backend, no service_role key in the browser.

```
src/app/lib/supabase/
  client.ts            ← typed createClient<Database>(...) singleton
  database.types.ts    ← manually typed schema (mirrors public tables)
```

### Realtime strategy

- **Repository** subscribes to `bols`, `signatures`, `shipments` on any change → re-fetches list. Live-update badge shown in the toolbar.
- **BOL detail** subscribes filtered on `bol.id` / `bol_id` → refreshes metadata and signatures instantly when the driver app changes data.
- **Shell** subscribes to `notifications` for the current user → shows toast pop-ups and an unread count badge on the nav.

All channels are removed in `ngOnDestroy` via `supabase.removeChannel(...)`.

### Feature structure

```
src/app/
  core/
    guards/auth.guard.ts             ← CanActivateFn; redirects /login if no session
    layout/shell.component.ts        ← Fixed sidebar wrapping all protected routes
  features/
    auth/
      auth.service.ts                ← Session signal, signIn/Out, APP_INITIALIZER
      login/login.component.ts       ← Email/password form
    locations/
      locations.service.ts           ← CRUD against locations table
      locations.component.ts         ← Table + create/edit dialog + delete confirm
    bols/
      bols.service.ts                ← uploadBol, list, getById helpers
      upload/upload.component.ts     ← PDF drag-drop + shipment/BOL metadata form
      detail/bol-detail.component.ts ← Metadata, status timeline, signatures, PDF download
    repository/
      repository.component.ts        ← BOL table with search/status filter + live updates
  lib/supabase/
    client.ts
    database.types.ts
```

### Route map

| Path | Component | Guard |
|---|---|---|
| `/login` | `LoginComponent` | none |
| `/` | redirect → `/repository` | `authGuard` |
| `/repository` | `RepositoryComponent` | `authGuard` |
| `/locations` | `LocationsComponent` | `authGuard` |
| `/upload` | `UploadComponent` | `authGuard` |
| `/bols/:id` | `BolDetailComponent` | `authGuard` |

### Auth initialization

`AuthService.initialize()` is registered as an `APP_INITIALIZER` so the session is restored from `localStorage` before any route guard runs. `onAuthStateChange` keeps the session signal in sync for the app lifetime.

### Storage

BOL PDFs are uploaded to the `bol-documents` bucket at path `{uid}/{timestamp}-{bolNumber}.pdf`. The returned public URL is stored in `bols.pdf_url`. Signature images live in the `signatures` bucket (written by the driver/consignee apps, read here for display).
