# CounterFlame FACEIT
Community competitive platform MVP for CounterFlame. Not affiliated with the game developer.

## Included
- Supabase email/password authentication and automatic player profiles
- Six-digit Match Code lobby creation and joining
- Realtime lobby chat
- HTTPS screenshot evidence submission for moderator review
- Responsive dark/orange interface

## Game API limitation
No game API is integrated or assumed. This platform cannot independently read match results or prove screenshot authenticity. Evidence is submitted for human moderator review. Do not mark a result verified or award ELO solely from an uploaded image. Leaderboard unlocks only after a trusted verification workflow is implemented.

## Setup
1. Create a project at https://supabase.com.
2. Run all of `supabase/schema.sql` in Supabase SQL Editor.
3. Enable Email under Authentication > Providers.
4. Copy `.env.example` to `.env.local` and enter the Supabase Project URL and anon/public key.
5. Run `npm install`, then `npm run dev`; open http://localhost:3000.

## Deploy
Import this repository into Vercel and add the two `NEXT_PUBLIC_SUPABASE_*` environment variables.

## Before public launch
- Add moderator roles and secure server-side review endpoints.
- Use private Supabase Storage for screenshots rather than third-party URLs.
- Add rate limits, lobby capacity/team balancing, ready checks and dispute handling.
- Add audit logs and server-side ELO updates after verified results.
- Review and test RLS policies before public launch.

Stack: Next.js 15, React 19, TypeScript, Tailwind CSS, Supabase Auth/Postgres/Realtime.
