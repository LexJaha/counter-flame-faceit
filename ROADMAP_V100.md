# CounterFlame FACEIT — V100 Roadmap

This is a release plan, not a claim that all 100 milestones are implemented. A milestone is complete only after code, database authorization, deployment, and relevant tests are verified.

## Current verified baseline (2026-11-21)

- Next.js app with Supabase authentication and player profiles.
- ELO leaderboard based on moderator-approved results.
- 1v1–5v5 matchmaking queue with ELO widening and client polling.
- Match rooms, realtime room chat, screenshot evidence upload and moderator review.
- Teams, direct messages, notifications, blocking/reporting foundations.
- Basic 1v1 tournament registration/bracket progression workstream.
- AI screenshot OCR/verification and live CS2 game-server integration are not implemented.
- Real concurrent-player matchmaking and production load tests remain outstanding.

## V1–V10 — Core and matchmaking
1. V1 — Responsive Next.js platform shell and orange/black visual system.
2. V2 — Supabase authentication and session handling.
3. V3 — Player profiles, ELO and leaderboard.
4. V4 — Ranked queue, ELO matching and stale queue recovery.
5. V5 — Match rooms, realtime chat and evidence submission.
6. V6 — Basic 1v1 tournament registration and bracket progression.
7. V7 — Party queueing and party-size validation.
8. V8 — Region and latency preferences using measured latency.
9. V9 — Reconnect recovery, queue restoration and duplicate-session handling.
10. V10 — Concurrent-user matchmaking tests and load checks.

## V11–V20 — Match operations and evidence
11. V11 — Searchable match history and match detail pages.
12. V12 — Persisted map veto workflow.
13. V13 — Team captain and ready-check flow.
14. V14 — Structured result reporting and opponent confirmation.
15. V15 — Disputes, moderator notes and audit trail.
16. V16 — Private evidence gallery, signed access and retention rules.
17. V17 — OCR extraction of player names and scoreboard values.
18. V18 — Screenshot-to-match roster and score consistency checks.
19. V19 — Image anomaly signals and confidence scoring.
20. V20 — AI-assisted review queue; moderators retain final authority.

## V21–V30 — Player analytics and community
21. V21 — Match timeline and filters.
22. V22 — Win/loss and rating trend charts.
23. V23 — Map and mode statistics.
24. V24 — Achievements and milestones.
25. V25 — Shareable profiles and privacy controls.
26. V26 — Friend requests and friend list.
27. V27 — DM pagination, read state and notification preferences.
28. V28 — Team invitations, captain transfer and roster management.
29. V29 — Reports, blocks and abuse-prevention workflows.
30. V30 — Notification center and category preferences.

## V31–V40 — Tournaments and ranked seasons
31. V31 — Tournament creation, registration and capacity limits.
32. V32 — Team entries and tournament check-in.
33. V33 — Bracket generation for supported tournament sizes.
34. V34 — Result reporting, disputes and bracket advancement.
35. V35 — Standings, tournament history and organizer controls.
36. V36 — Skill divisions and promotion/demotion rules.
37. V37 — Season lifecycle and scheduled resets.
38. V38 — Season rewards and achievement grants.
39. V39 — Regional and friends leaderboards.
40. V40 — Transparent rating reset/decay history.

## V41–V50 — Operations and production readiness
41. V41 — Admin dashboard with role-based access.
42. V42 — Granular moderator permissions and audit logs.
43. V43 — Suspicious-match review and evidence escalation.
44. V44 — Sanctions, appeals and expiry handling.
45. V45 — Security review: RLS, RPC authorization, storage policies, rate limits and dependency audit.
46. V46 — Mobile usability and accessibility pass.
47. V47 — Live match center and reliable realtime status.
48. V48 — Operational analytics, error monitoring and service health.
49. V49 — Performance, backup/restore and disaster-recovery checks.
50. V50 — End-to-end acceptance tests, load tests, security sign-off and production release.

## V51–V60 — Matchmaking 2.0
51. V51 — Party invites and coordinated queue entry.
52. V52 — Team composition validation for 2v2–5v5.
53. V53 — Rating calibration and placement matches.
54. V54 — Region selection based on supported infrastructure.
55. V55 — Latency-aware matching with measured ping.
56. V56 — Ready-check timeout and AFK handling.
57. V57 — Safe reconnect and abandoned-match recovery.
58. V58 — Queue priority rules with transparent, abuse-resistant limits.
59. V59 — Rematch flow with opt-in from all players.
60. V60 — Matchmaking simulation and concurrency/load test suite.

## V61–V70 — Competitive match center
61. V61 — Map pool management and veto sequence.
62. V62 — Map-specific match configuration.
63. V63 — Captain selection and team-side assignment.
64. V64 — Ready-up phase and start authorization.
65. V65 — Match server detail panel (manual/provider-backed until integration exists).
66. V66 — Structured score submission.
67. V67 — Opponent confirmation and disagreement handling.
68. V68 — Dispute center with evidence and deadlines.
69. V69 — Full match history and audit timeline.
70. V70 — Live match center with resilient realtime updates.

## V71–V80 — AI-assisted evidence review
71. V71 — OCR pipeline for uploaded screenshots.
72. V72 — Player-name extraction with confidence values.
73. V73 — Scoreboard and team-score extraction.
74. V74 — Compare extracted evidence with the submitted match roster.
75. V75 — Duplicate and suspicious-evidence indicators.
76. V76 — Calibrated confidence score with explainable reasons.
77. V77 — Moderator review dashboard.
78. V78 — Player appeal and correction workflow.
79. V79 — Evidence access log and retention controls.
80. V80 — Accuracy, bias, false-positive and adversarial-input evaluation.

## V81–V90 — Leagues and community
81. V81 — Ranked divisions and promotion rules.
82. V82 — Season schedules and lifecycle automation.
83. V83 — Season leaderboard and player history.
84. V84 — Achievement system.
85. V85 — Advanced player statistics.
86. V86 — Team rating and team leaderboard.
87. V87 — Team tournament support.
88. V88 — Friends, presence and privacy controls.
89. V89 — Safer messaging controls, blocking and reporting.
90. V90 — Community announcements and moderated hub.

## V91–V100 — Platform maturity
91. V91 — Admin operations dashboard.
92. V92 — Least-privilege moderator roles and audit trail.
93. V93 — Abuse, suspicious-result and integrity review workflows.
94. V94 — Independent security review and remediation.
95. V95 — Installable mobile web experience and accessibility audit.
96. V96 — Performance budgets, caching and reliability improvements.
97. V97 — Product analytics with privacy-conscious event collection.
98. V98 — Tested backups, restore drills and incident runbooks.
99. V99 — Full regression, accessibility, security and load-test gate.
100. V100 — Production release only after all critical gates pass.

## Non-negotiable integrity rules

- Never create fake opponents, fake queue entries or fabricated activity.
- Never apply rating changes from an unreviewed or disputed result.
- AI output is advisory until independently evaluated; moderators retain final authority.
- Do not claim official CS2 API, anti-cheat or game-server integration unless it is actually connected and tested.
- Do not mark a milestone complete based on a roadmap entry alone.
- Each release requires build/type checks, database security review, and relevant real-user tests.
