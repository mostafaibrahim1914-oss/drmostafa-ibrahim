# Ancient Minds Academy

## Running on Replit

- Keep the imported React 19, TanStack Start, Vite 8, and Supabase stack and existing project structure.
- Runtime: Node.js 22 and Bun 1.3.
- Dependencies: `bun install` (use the existing `bun.lock`).
- Click **Run** to start the `Start application` workflow, which runs `bun run dev`.
- The development server listens on `0.0.0.0:5000` and accepts Replit preview hosts.
- Build check: `bun run build`.
- The existing build configuration targets Cloudflare; this setup does not change its deployment target or publish the app.

## Supabase configuration

The imported `.env` contains the existing public Supabase connection configuration:

- `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` for the browser.
- `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` for server authentication.
- Project ID variables are also included in the import.

Continue using the existing Supabase project; do not replace it or migrate its database as part of environment setup.

Admin password resets and account deletion additionally require `SUPABASE_SERVICE_ROLE_KEY` in Replit Secrets. This key was not supplied with the import. Never prefix it with `VITE_` or put it in browser code.

The README contains an admin password from the original project brief. Treat it as exposed: rotate it in the existing authentication provider and remove it from documentation before production use.

## Setup verification

- Production build completed successfully.
- Home page visually checked in Replit preview with no browser errors.
- Sign-in route returned HTTP 200.
- Existing Supabase authentication settings endpoint returned HTTP 200.
- Signed-in student/admin dashboards and privileged admin actions were not verified; no account data was changed.
