# Project context

**EBOL Shipper Portal** is a web app for **shippers** to manage **locations**, **upload BOL PDFs**, and **track document status** with live updates (signatures, notifications). There is no custom backend in this repo: the browser talks to **Supabase** (Postgres, Auth, Storage, Realtime) with the **anon** key only; Row-Level Security is expected to enforce tenant boundaries. The UI is **Angular 21** (standalone components, strict TypeScript), **PrimeNG 21** with a custom **Transflo** theme preset, **RxJS**, and **Leaflet** for the home map. Demo sign-in credentials are documented in `README.md`.

## Repository map

- **`src/`** — Angular application (`main.ts`, `app/`, `environments/`, `styles.scss`, `theme/`).
- **`public/`** — Static assets copied into the build (e.g. favicon per `angular.json`).
- **`supabase/`** — SQL migrations checked into the repo (currently one migration for location coordinates).
- **`.vscode/`** — Editor/workspace settings (partially tracked per `.gitignore`).
- **`dist/`** — Build output (gitignored when present); production build default path is `dist/ebol-web` per `README.md`.
- **Root configs** — `package.json`, `angular.json`, `tsconfig*.json`, `proxy.conf.json`, `.prettierrc`, `.editorconfig`, `.gitignore`.

## How to run locally

| Step | Command / note |
|------|----------------|
| Install | `npm install` |
| Dev server | `npm start` → runs `ng serve` (Angular CLI default **http://localhost:4200** unless overridden). |
| Proxy | `angular.json` sets `serve.options.proxyConfig` to **`proxy.conf.json`**. **`/nominatim`** is proxied to `https://nominatim.openstreetmap.org` (used in dev by `GeocodingService` to avoid browser CORS). |

**Prerequisites** (from `README.md`): Node.js ≥ 18, npm ≥ 9. `package.json` also pins `packageManager` to `npm@11.6.2`.

## Build & test

| Task | Command | Notes |
|------|---------|--------|
| Production build | `npm run build` → `ng build` | Default Angular output layout; `README.md` mentions `dist/ebol-web`. |
| Dev watch build | `npm run watch` → `ng build --watch --configuration development` | |
| Unit tests | `npm test` → `ng test` | **`angular.json` has no `test` target** under `projects.ebol-web.architect`; running `ng test` may error until a test builder is configured. |
| Lint | — | **No ESLint (or other lint) script or config** found in the repo root. |
| Typecheck | — | **No dedicated `tsc --noEmit` script**; typechecking occurs via `ng build` / IDE. |

`tsconfig.spec.json` references **`vitest/globals`** in `compilerOptions.types`, but **`vitest` is not a `package.json` dependency** and **no `*.spec.ts` files** exist—confirm intended test runner in `package.json` / future Angular test setup.

## Configuration & secrets

| Item | Detail |
|------|--------|
| **Supabase URL / anon key** | **`src/environments/environment.ts`** exports `environment.supabase.url` and `environment.supabase.anonKey`. **`src/app/lib/supabase/client.ts`** reads these and throws if missing. |
| **`.env`** | **Not used** in code scanned; `README.md` states no `.env` is needed because credentials are in `environment.ts`. |
| **Production vs development env** | **Only `environment.ts` is present** under `src/environments/`; there is **no** `environment.prod.ts` or `fileReplacements` in `angular.json`—how production builds swap credentials is **Unknown** (would be confirmed by adding prod environment files and `angular.json` `configurations.production` file replacements, or deployment pipeline env injection). |
| **Other env vars** | **None referenced** in application code from files reviewed; no `process.env` usage observed in the Angular app. |

**Security note for contributors:** The anon key is **intended to be public in the browser** but is still tied to your Supabase project; rotating keys or using separate Supabase projects per environment is a product/ops decision—confirm in Supabase dashboard and any CI/CD secrets store (**Unknown** from repo files alone).

## Architecture

### Bootstrap and shell

- **Entry:** `src/main.ts` bootstraps **`App`** from `src/app/app.ts` with **`appConfig`** from `src/app/app.config.ts`.
- **Root component:** `App` is a thin `<router-outlet />` host (`ebol-root` in `index.html`).

### Routing (`src/app/app.routes.ts`)

| Path | Guard / layout | Component |
|------|----------------|-----------|
| `/login` | None | Lazy `LoginComponent` |
| `''` (under `ShellComponent`) | `authGuard` | Lazy `HomeComponent` (default authenticated landing) |
| `repository`, `locations`, `upload`, `bols/:id` | `authGuard`, inside shell | Lazy feature components |
| `/ds-verify` | None | Lazy `DsVerifyComponent` (design-system sanity check; see sharp edges) |
| `**` | — | Redirect to `''` |

**README.md route table** says `/` redirects to `/repository` and lists `/` as redirect-only; **actual code** uses **`HomeComponent` at path `''`** inside the shell, and login navigates to **`['/']`**. Treat **README as stale** for default post-login destination unless README is updated.

### Auth

- **`AuthService`** (`src/app/features/auth/auth.service.ts`): `signal` for session; `initialize()` loads session and subscribes to `onAuthStateChange`.
- **`APP_INITIALIZER`** in `app.config.ts` runs `auth.initialize()` before routing.
- **`authGuard`**: `CanActivateFn` redirecting unauthenticated users to `/login`.

### State and data

- **No NgRx or global store** beyond Angular signals in services/components and Supabase realtime callbacks.
- **Data layer:** single Supabase client singleton in `src/app/lib/supabase/client.ts`, typed with **`database.types.ts`** (hand-maintained mirror of `public` tables).
- **Feature services:** e.g. `BolsService` (storage upload to bucket `bol-documents`, inserts/upserts into `shipments` / `bols`), `LocationsService`, etc.
- **Realtime:** `ShellComponent` listens to `notifications`; repository and BOL detail components subscribe to relevant tables (pattern described in `README.md`).

### HTTP to third parties

- **Nominatim:** dev uses relative `/nominatim` (proxy); production uses `https://nominatim.openstreetmap.org` per `GeocodingService` and `isDevMode()`.
- **Maps:** Leaflet loads OSM tiles from `https://{s}.tile.openstreetmap.org/...` in `HomeComponent`.

### Backend / API

- **No Express/Fastify/etc.** in this repo. **All “API” is Supabase** (PostgREST, Auth, Storage, Realtime) from the browser.

## Conventions

- **Component selector prefix:** `ebol` (`angular.json` `prefix`).
- **Styling:** SCSS (`inlineStyleLanguage: "scss"`), standalone components with inline `styles`/`template` common in features.
- **Strictness:** `tsconfig.json` uses strict TypeScript and Angular strict template/injection flags.
- **Formatting:** **Prettier** (`.prettierrc`: `printWidth` 100, `singleQuote`, Angular HTML parser override). **No npm script** for `prettier`—run via editor or `npx prettier` if desired.
- **EditorConfig:** `.editorconfig` — 2-space indent, UTF-8, final newline; TS single quotes.
- **New schematics:** `angular.json` sets **`skipTests: true`** for generated components/services/guards/etc.
- **`.cursor/rules`:** **Not present** in this workspace snapshot.

## Known sharp edges

- **README vs routes:** Post-login landing and `/` behavior differ between `README.md` and `src/app/app.routes.ts` / `login.component.ts` (see Architecture).
- **Tests:** `npm test` is defined but **`angular.json` lacks a test architect**; `tsconfig.spec.json` mentions Vitest without matching dependencies or specs—easy to confuse future contributors.
- **Design-system reference:** `DsVerifyComponent` comment points to **`src/stories/button/button.stories.ts`**, which **does not exist** in this repo—verify against the real design-system package or remove/update the reference.
- **Single environment file:** Production Supabase URL/key strategy is unclear; changing `environment.ts` affects all local builds until a split is introduced.
- **Home map data:** `HomeComponent` uses **hardcoded demo coordinates**, not Supabase—do not assume it reflects live shipments until wired to real data.
- **Geocoding / Nominatim:** Respect [Nominatim usage policy](https://operations.osmfoundation.org/policies/nominatim/); heavy or automated use may need a dedicated instance or another geocoder (**policy details not in repo**).
- **No TODO/FIXME grep hits** in `*.ts` / `*.scss` / `*.html` / `*.md` / `*.sql` at time of scan—ongoing work may still live in issues only.

## Suggested next tasks

1. **Align documentation:** Update `README.md` route map and post-sign-in flow to match `app.routes.ts` and `LoginComponent` navigation.
2. **Fix the test story:** Either add an `angular.json` `test` target (e.g. Karma/Jasmine or Vitest per team standard), remove/adjust `tsconfig.spec.json` Vitest types, and add a minimal smoke spec—or drop `npm test` until ready.
3. **Split environments:** Add `environment.development.ts` / `environment.production.ts` and `fileReplacements` in `angular.json` so production builds do not rely on dev Supabase credentials in source (or document CI injection if that is the chosen pattern).
4. **Restore or fix DS verify reference:** Add Storybook stories under `src/stories/` or change `DsVerifyComponent` to cite an existing artifact.
5. **Add linting:** ESLint (with `@angular-eslint`) plus an `npm run lint` script for consistent CI/local checks.
6. **Document deployment:** Add `vercel.json`, Netlify, or internal runbook—**deployment target is Unknown** from repo files (`vercel.json` absent).
7. **Expand Supabase folder:** If CLI-managed, add `config.toml` and migration history matching the live project; keep `database.types.ts` in sync when schema changes (or generate types via Supabase CLI—**current process Unknown**).
