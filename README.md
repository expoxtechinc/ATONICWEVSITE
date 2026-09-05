# A.Tonic — Official

A production-oriented artist website and private studio for A.Tonic. The public site presents releases, visuals, licensing, and copyright information. The private studio manages uploads and release metadata.

The public website is anonymous-access: visitors can listen, browse, submit licensing requests, and verify licenses without creating an account. Only the Google-authenticated account `aki.sokpah.link@gmail.com` can enter the admin studio or call admin upload procedures.

## Runtime integrations

The app uses Supabase Auth for Google OAuth, email/password authentication, persisted browser sessions, and server-side bearer-token validation. Supabase also stores the music catalogue, private storage, licensing records, signed URLs, and download/play tracking.

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
- `JWT_SECRET` — retained for server runtime compatibility; Supabase access tokens are the authentication source

`vercel.json` routes `/api/*` to the Express/tRPC serverless entrypoint and serves the Vite output from `dist/public`.

The repository template is [`ENVIRONMENT.example`](./ENVIRONMENT.example). Copy its four entries into Vercel; no Manus application ID, OAuth portal URL, OAuth server URL, or owner open ID is used anywhere in the active application.

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

First, open Vercel Project Settings → Environment Variables and add only `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `JWT_SECRET` for Production and Preview. The Vite configuration exposes only the public URL and anon key to the browser; the service-role key remains server-only.

Next, open Supabase Dashboard → Authentication → Providers → Google, enable Google, and configure the Google OAuth client. Set the Supabase callback URL shown in the provider screen, normally `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`, in Google Cloud Console. Add `https://YOUR-DOMAIN.com/**` to Supabase Authentication → URL Configuration → Redirect URLs. Enable Email provider if email/password login is required.

Google sign-in cannot become active from application code alone. The current Supabase project reports Email enabled and Google disabled, so the Google client ID and secret must be entered in Supabase Dashboard → Authentication → Providers → Google before the Google button can complete an OAuth flow.

After deployment, visit the public homepage in an incognito window. Confirm that the homepage, release images, `/licensing`, and `/verify-license/[license-id]` work without sign-in. Then visit `/admin`, click **Continue with Google**, sign in as `aki.sokpah.link@gmail.com`, and confirm that `/admin/upload` opens. The `profiles` trigger automatically assigns that email the `admin` role; every other account receives `user` and is rejected by server-side `adminProcedure` checks. Test email/password login as well, then upload one small MP3 and verify the private object in Supabase Storage → `full_audio`.
