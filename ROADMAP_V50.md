# CounterFlame FACEIT — V50 Roadmap

This document tracks implementation honestly. A version is not marked complete until its code, database rules, deployment, and relevant tests are verified. The version number is a release milestone, not a claim that every feature below is already live.

## Current baseline

- Supabase authentication and player profiles.
- ELO leaderboard fed by moderator-approved ranked results.
- Matchmaking queue for 1v1–5v5 with ELO widening and polling.
- Match rooms, realtime room chat, screenshot evidence upload.
- Moderator review before ranked ELO updates.
- Teams, direct messages, notifications, account blocking/reporting foundations.
- Tournament registration and single-player (1v1) bracket generation/result progression added in the V6 workstream.
- Screenshot evidence is currently reviewed by moderators; AI image verification is not implemented.
- Live game-server integration is not present; matchmaking pairs registered platform users, not CS2 game servers.

## V1–V5 — Core platform

1. V1 — Next.js platform shell and responsive orange/black design.
2. V2 — Supabase sign-up, sign-in and session handling.
3. V3 — Player profiles, ELO and leaderboard.
4. V4 — Ranked queue, ELO matching and stale queue recovery.
5. V5 — Match rooms, realtime chat and evidence submission.

## V6–V10 — Matchmaking quality

6. V6 — Tournament registration foundation and verified 1v1 first-round bracket flow.
7. V7 — Full team-party queueing and party-size validation.
8. V8 — Region and latency preferences (requires reliable client/server ping measurements).
9. V9 — Reconnect recovery, queue restoration after refresh and duplicate-session handling.
10. V10 — Concurrent-user matchmaking tests and production load checks.

## V11–V15 — Match operations

11. V11 — Searchable match history and player match detail pages.
12. V12 — Map veto workflow with persisted picks/bans.
13. V13 — Team captain and ready-check flow.
14. V14 — Structured result reporting with opponent confirmation.
15. V15 — Dispute workflow, moderator notes and audit trail.

## V16–V20 — Evidence and AI review

16. V16 — Evidence gallery with private signed access and retention rules.
17. V17 — OCR extraction of player names and scoreboard values.
18. V18 — Screenshot-to-match roster and score consistency checks.
19. V19 — Tampering/anomaly signals and confidence scoring.
20. V20 — AI-assisted review queue; moderators retain final authority.

## V21–V25 — Player analytics

21. V21 — Match history timeline and filters.
22. V22 — Win/loss and rating trend charts.
23. V23 — Map and mode statistics.
24. V24 — Achievements and milestones.
25. V25 — Shareable player profile and privacy controls.

## V26–V30 — Community

26. V26 — Friend requests and friend list.
27. V27 — DM read receipts, pagination and notification preferences.
28. V28 — Team invitations, captain transfer and team roster management.
29. V29 — Reports, blocks and abuse-prevention workflows.
30. V30 — Notification center with per-category preferences.

## V31–V35 — Tournaments

31. V31 — Tournament creation, registration and capacity limits.
32. V32 — Team-based tournament entries and check-in.
33. V33 — Automated bracket generation for supported sizes.
34. V34 — Match reporting, dispute handling and bracket advancement.
35. V35 — Tournament standings, history and organizer controls.

## V36–V40 — Ranked seasons

36. V36 — Skill divisions and promotion/demotion rules.
37. V37 — Season lifecycle and scheduled resets.
38. V38 — Season rewards and achievement grants.
39. V39 — Regional and friends leaderboards.
40. V40 — Rating decay/reset policy with transparent history.

## V41–V45 — Operations and safety

41. V41 — Admin dashboard with role-based access.
42. V42 — Granular moderator permissions and audit logs.
43. V43 — Suspicious-match review and evidence escalation.
44. V44 — Sanctions, appeals and expiry handling.
45. V45 — Security review: RLS, RPC authorization, storage policies, rate limits and dependency audit.

## V46–V50 — Production readiness

46. V46 — Mobile usability and accessibility pass.
47. V47 — Live match center and reliable realtime status.
48. V48 — Operational analytics, error monitoring and service health.
49. V49 — Performance, backup/restore and disaster-recovery checks.
50. V50 — End-to-end acceptance tests, load tests, security sign-off and production release.

## Release gates

- Never create fake opponents or fake activity to make the platform look populated.
- Never apply ELO from an unreviewed or disputed result.
- AI output is advisory until accuracy and abuse resistance are independently tested.
- Keep game publisher APIs and server integration claims explicit; no official CS2 API is currently connected.
- Each release must pass TypeScript/build checks, database security review and a real-user test before being marked complete.
