# CounterFlame FACEIT — V1000 development track

A dark, orange-accented competitive community platform built with Next.js, TypeScript, Tailwind CSS and Supabase.

## Current working modules

- Supabase email/password sign-in and player profiles.
- ELO leaderboard backed by verified match history.
- Matchmaking queue for 1v1, 2v2, 3v3, 4v4 and 5v5.
- Private match rooms with automatically generated six-digit Match Codes.
- Team balancing when a player joins a room by code.
- Realtime match-room chat.
- Private screenshot evidence uploads (JPG, PNG, WebP; max 10 MB).
- Result submission with a moderator review gate before any ELO update.
- Editable player profiles (username and bio) backed by Supabase.
- Player search and one-to-one direct messages with block-aware messaging rules and realtime delivery.
- Team creation, public squad discovery, five-player roster limits and team membership controls.
- Account blocking and user reports stored under Row Level Security.

## Important verification limitation

No official game API is assumed or integrated. A screenshot can be edited and a client-provided AI confidence value is not proof of a match result. Evidence is stored privately and results remain pending until a trusted moderator approves them. ELO is changed only by the protected moderator-review function. Do not enable automated ELO awards from screenshots alone.

## Supabase setup

The connected project is already configured for this repository. For a fresh Supabase project:

1. Run `supabase/v1000_base.sql` in the Supabase SQL Editor.
2. Run `supabase/migrations/20261121_v1000_core.sql`.
3. Enable Email under Authentication → Providers.
4. Enable leaked-password protection under Authentication → Security and review your redirect URLs.
5. Copy `.env.example` to `.env.local` and set the project URL and publishable key. The repository includes a public publishable-key fallback for the currently linked project; replace it through environment variables if you rotate keys.
6. Start locally with `npm install` and `npm run dev`.

### Promote a moderator

Moderator access is not granted from user-editable profile metadata. A project owner must add a trusted account UUID directly in the SQL Editor:

```sql
insert into private.cf_moderators (user_id)
values ('AUTH_USER_UUID');
```

Keep the private schema inaccessible to browser roles. Never put a Supabase `service_role` or secret key in frontend code.

## Run

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Deploy

Import this repository into Vercel and configure:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

The publishable key is intended for browser use; Row Level Security policies protect database rows.

## V1000 roadmap

The V1000 name is the long-term product track, not a claim that one thousand releases or every roadmap feature is complete. Next milestones:

- **V2:** team invitations, captain transfers and team management extensions.
- **V3:** tournaments, brackets, check-ins and match scheduling.
- **V4:** moderator console, disputes, audit history and moderation analytics.
- **V5:** notifications, achievements, seasons and rewards.
- **V6:** stronger matchmaking calibration, rate limits, abuse prevention and load testing.
- **V7:** PWA polish, accessibility, observability and production deployment checks.

Every milestone should be implemented, tested and reviewed before being called complete.

## Stack

Next.js · React · TypeScript · Tailwind CSS · Supabase Auth · PostgreSQL · Supabase Realtime · Supabase Storage

Community project; not affiliated with any game publisher.
