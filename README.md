# A.Tonic — Official

A production-oriented artist website and private studio for A.Tonic. The public site presents releases, visuals, licensing, and copyright information. The private studio manages uploads and release metadata.

The public website is anonymous-access: visitors can listen, browse, submit licensing requests, and verify licenses without creating an account. Only the Google-authenticated account `aki.sokpah.link@gmail.com` can enter the admin studio or call admin upload procedures.

## Runtime integrations

The app uses the Manus-authenticated Express/tRPC runtime for private studio access and Supabase for the music catalogue, private storage, licensing records, signed URLs, and download/play tracking.

The Supabase project contains these core tables:

- `artist_profile`
- `releases`
- `licenses`
- `downloads`
- `play_events`

The migration also creates private buckets for `covers`, `previews`, `full_audio`, `videos`, `artwork`, `documents`, `licenses`, and `artist_profile`.

## Required Vercel environment variables

Set these in the Vercel project settings for Preview and Production:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — server-only; never expose it as a `VITE_` variable
- `JWT_SECRET`
- `OAUTH_SERVER_URL`
- `VITE_APP_ID`
- `OWNER_OPEN_ID`

`vercel.json` routes `/api/*` to the Express/tRPC serverless entrypoint and serves the Vite output from `dist/public`.

## Workflows now connected

- Admin audio upload: requests a short-lived signed upload URL, uploads the master into private `full_audio`, then creates a draft release record.
- Licensing: reads published releases from Supabase, issues a license record for authenticated users, and returns a unique license code.
- Verification: `/verify-license/[licenseId]` checks the live license record.
- Downloads: validates an active license with download rights, issues a five-minute signed URL, and records a download event with a hashed IP, user agent, file version, and status.
- Play tracking: records hashed session play events without storing unnecessary personal information.
- UI: uses route transitions, reduced-motion support, upload progress states, skeleton-like loading treatment, and interactive player feedback.

## Local validation

```bash
pnpm check
pnpm test
pnpm build
```

## Production checklist

First, open Vercel Project Settings → Environment Variables and add `VITE_APP_ID`, `VITE_OAUTH_PORTAL_URL`, `OAUTH_SERVER_URL`, `JWT_SECRET`, `OWNER_OPEN_ID`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` for Production and Preview. Do not prefix the service-role key with `VITE_`.

Next, open the Manus OAuth application settings and add the exact callback URL `https://YOUR-DOMAIN.com/api/oauth/callback`. If the project uses a custom domain, use that domain rather than the Vercel preview URL. Ensure the OAuth portal has Google enabled, then redeploy Vercel so the Vite variables are embedded into the client build.

After deployment, visit the public homepage in an incognito window. Confirm that the homepage, release images, `/licensing`, and `/verify-license/[license-id]` work without sign-in. Then visit `/admin`, click **Continue with Google**, sign in as `aki.sokpah.link@gmail.com`, and confirm that `/admin/upload` opens. Test a second Google account and confirm it is rejected. Finally, upload one small MP3 in the studio, confirm it appears as a draft, and check Supabase Storage → `full_audio` for the private object.
