# LinguaChat: agent guide

LinguaChat helps people learn a language by chatting with real native speakers (tandem exchange),
with an AI coach beside every conversation. Built for the Nexconn Build Challenge 2026.
Live: https://linguachat-chi.vercel.app · Repo: https://github.com/snenu/linguachat

This file is the working guide for anyone (human or agent) changing this repo. Keep it current.

## User journeys (learner's point of view)

### First-time learner
1. Lands on `/`, reads what LinguaChat does, taps "Create account".
2. Signs up with Clerk (`/signup`): first name, email + password with an email code, or Google.
   The first API call creates their `users` row and Nexconn id from the Clerk user.
3. Onboarding: display name, 16+ confirmation (required), native language(s), the language they
   learn, a CEFR self-check (can-do statements) or a manual A1–C2 pick, interests, goals, daily
   practice target, optional bio.
4. Lands on Home: today's goal, streak, flashcards due, suggested partners, tutor and rooms.

### Find a partner
1. Partners ranks native speakers of my target language by a compatibility score (tandem fit,
   shared interests, level balance, goals; +10 when online now via Nexconn presence).
2. Filters: their native language, their level, interest, "learning my language", online now, name.
3. Profile → chat request with intro. The recipient's list refreshes instantly (Nexconn status
   message). Accept / decline / cancel.
4. On accept, a direct channel opens for both with a welcome notice sent by the server.
5. Block (Nexconn blocklist + app-side hiding) or report (also blocks) from profile or chat header.

### Chat with AI coaching (direct channel)
- "Check before sending" shows the corrected sentence + one-line reason; send corrected / edit / send mine.
- After sending, the server corrects the message and attaches the correction as Nexconn message
  metadata (`aic`); both people see a quiet, expandable "Coach note". Saved to the mistake log.
- Partner correction card (custom message `LGC:Correction`): original vs corrected + note + type;
  recorded in the corrected partner's mistake log.
- Tap a message → react (👍 ❤️ 😂 😮 🙏, Nexconn reactions, live for both), Reply, Translate
  (Gemini, into my native language), Listen (SpeechSynthesis), Correct (partner's messages). Tap a word → meaning, reading, example; save to vocabulary or
  share as a vocab card (`LGC:VocabCard`).
- HD voice messages (recorded as 16 kHz WAV) → Gemini transcript (+ correction for my own voice)
  attached as metadata (`vtx`).
- Typing indicator, read receipts, unread counts, history paging, optimistic sends with retry,
  reconnect banner, "signed in elsewhere" handling.

### AI tutor
- Scenes: café, job interview, travel, doctor, small talk, or custom.
- The tutor is a real Nexconn bot user per language (e.g. "Emma (AI English tutor)") in a direct
  channel. The server streams replies as `RC:StreamMsg` via the Platform Chat API; corrections
  attach to the learner's messages as metadata; "Help me reply" posts an `LGC:TutorTip` card.

### Practice rooms (group channels)
- 12 rooms per language (3 level bands × 4 topics), created lazily on first join; the server adds
  members to the Nexconn group. Rooms in my native languages appear under "Help … learners".
- First visit of the (UTC) day: the server generates a prompt with Gemini and the room host bot
  posts it (`LGC:RoomPrompt`); it is also pinned at the top for people who join later.
- Members list with live presence and online count. Same coach notes as in chats.

### Progress
- Overview: streak (days meeting the daily target), longest streak, 7-day chart, weekly and
  all-time stats.
- Vocabulary notebook (search, add, delete, listen) and SM-2 flashcard review (keyboard 1–4).
- Mistake log grouped by type with frequent tags and AI-found patterns ("You often …").

### Edge cases handled
- Not signed in → `/login` (Clerk); not onboarded → `/onboarding`; 401 from any API → sign-in.
- Clerk user without a profile row → created on first request; a pre-Clerk row with the same
  verified email is linked (`lib/server/session.ts#provisionUser`). Account deletion removes the
  Clerk user as well.
- Nexconn token rejected (31004) → fresh token from the server and reconnect; kicked by another
  device (31010) → banner with "Reconnect here"; network drop → auto reconnect, history reload.
- AI busy (429/503) → retries + model fallback, then a friendly message; chat keeps working.
- Failed sends show "Retry"/"Delete"; voice uploads retry after reconnect without re-recording.
- Empty states on every list; no demo data in production.

## Architecture

```
Browser (Next.js client components)
  ├─ Nexconn Web Chat SDK (@nexconn/chat)  ── WebSocket ──►  Nexconn SG (direct/group channels,
  │    src/lib/nexconn/client.ts                                presence, metadata, receipts…)
  └─ fetch /api/*  ──►  Next.js route handlers on Vercel (region sin1)
                           ├─ Neon Postgres (Drizzle, neon-http)   users, matches, vocab, mistakes…
                           ├─ Nexconn Platform Chat API (signed)   tokens, bot/system messages,
                           │    src/lib/nexconn/server.ts          streaming, metadata, groups, blocklist
                           ├─ Gemini (@google/genai)               corrections, translation, words,
                           │    src/lib/ai/*                        voice transcripts, tutor, prompts
                           └─ Vercel Blob                          profile photos
```
No console webhooks are used: the client calls our API after an SDK action (e.g. after sending a
message it calls `/api/ai/annotate`), the server verifies membership/partnership and acts through
the Platform Chat API.

## Folder map

```
src/app/                    pages (landing, (auth), onboarding, app/*), api/* route handlers, metadata
                            files (icon.svg, favicon.ico, apple-icon.png, opengraph-image.tsx,
                            manifest.ts, robots.ts, sitemap.ts), not-found, error, global-error
src/proxy.ts                clerkMiddleware() (Next 16 calls middleware "proxy")
src/app/(auth)/             login/[[...rest]] and signup/[[...rest]]: Clerk <SignIn>/<SignUp>
src/app/api/                me, nexconn/token, partners, requests, blocks, reports, users,
                            ai/{check,annotate,translate,word,voice}, corrections, vocab, mistakes,
                            progress, tutor/{sessions,turn,hint}, rooms/[id]/{join,leave,visit}
src/components/landing/     hero demo (animated correction), reveal-on-scroll, tutor demo, flip card, header
src/components/app/         providers (session user, Nexconn connection, presence, people), shell
src/components/chat/        thread, message rendering, composer, dialogs, channel list, useThread
src/components/partners/    partner card, profile dialog
src/components/ui/          buttons, form controls, dialog, toast, avatar, misc
src/db/                     Drizzle schema + client          drizzle/  SQL migrations
src/lib/nexconn/            server.ts (Platform API), client.ts (Web SDK), types.ts, model.ts
src/lib/ai/                 gemini.ts (retry/fallback/stream), coach.ts (prompts + schemas + cache)
src/lib/server/             env, session (Clerk auth → users row), http, rate-limit, domain, social, tutor, rooms
src/lib/clerk-appearance.ts Clerk component theme (airmail palette, cssLayerName "clerk")
src/lib/                    languages, sm2, compat, streak, rooms, day, validation (shared),
                            brand (logo paths), site (public URL)
scripts/icons.mjs           renders favicon/app icons/README logo from src/lib/brand.ts (needs sharp)
tests/unit/                 vitest: SM-2, compatibility, streaks, self-check, rooms, days
tests/e2e/                  Playwright: two-context tandem journey (real Nexconn + Gemini)
```

## Data model (Postgres)
- `users`: `clerk_user_id` (Clerk owns sign-in; `password_hash` only exists on pre-Clerk rows), profile, languages, CEFR level, interests, goals, daily target, timezone,
  auto-correct preference, Nexconn id (`lgcu…`) + cached token and the App Key it was issued for,
  16+ confirmation time.
- `chat_requests` (pending/accepted/declined/cancelled), `partnerships` (ordered pair), `blocks`, `reports`.
- `vocab_items` (SM-2: ease, interval, repetitions, due_at), `review_logs`.
- `mistakes` (category, tag, source: check/auto/partner/tutor/voice, corrected_by).
- `activity` (per local day; drives goal, streak and weekly stats; deduped by ref).
- `tutor_sessions`, `tutor_turns`; `rooms` (+ App Key the group was created in), `room_members`,
  `room_prompts` (one per room per day).
- `ai_cache` (hashed AI results), `rate_limits` (fixed windows).

## Nexconn features used (and where)

| Feature | Where |
| --- | --- |
| Token issue / user registration (server) | `lib/nexconn/server.ts#issueToken`, `api/nexconn/token` |
| SDK init (SG), connect, connection status, auto-reconnect, 31004 token refresh, 31010 kick | `lib/nexconn/client.ts` (`boot`, `connect`, `ConnectionStatusHandler`), shell banner |
| Direct channels (partners, tutor bot) | `client.ts#channel`, `components/chat/thread.tsx` |
| Group channels: create/join/leave (server), group messages | `server.ts#createGroup/joinGroup/quitGroup`, `lib/server/rooms.ts`, `app/app/rooms/[id]` |
| Custom message types `LGC:Correction`, `LGC:VocabCard`, `LGC:TutorTip`, `LGC:RoomPrompt`, `LGC:Notice` | registered in `client.ts#boot`; rendered in `chat/message-item.tsx` |
| Status (transient) message `LGC:Signal` | request/partner refresh and stream hand-off: `lib/server/social.ts#sendSignal`, `lib/server/tutor.ts` |
| Message metadata (send-enabled + server set + `onMessageMetadataUpdated`) | `client.ts#deliver` (`metadata`), `server.ts#setMessageMetadata`, `api/ai/annotate`, `api/ai/voice`, `api/tutor/turn` |
| Reply / quote (`RC:ReferenceMsg`; `referMsg` is the original content since SDK 26.5.1) | `client.ts#sendText`, `message-item.tsx` |
| Message reactions (`addReaction`/`removeReaction`, `getMessageReactionSummaries`, `onMessageReactionChanged`) | `client.ts#react/reactionSummaries`, `chat/use-reactions.ts`, chips + quick-react row in `message-item.tsx` |
| HD voice (`RC:HQVCMsg`, media upload) | `client.ts#sendVoice`, `lib/client/recorder.ts` |
| Streaming messages (`RC:StreamMsg` server send + `requestStreamMessage` + delta events) | `server.ts#streamDirectChunk`, `lib/server/tutor.ts`, `client.ts#requestStream/fetchById` |
| Server-sent bot/system messages | tutor bot, room host bot, accept notice (`api/requests/[id]`) |
| Read receipts (`sendReadReceiptResponse`, `getMessageReadReceiptInfo`, `onMessageReceiptResponse`) | `client.ts#markRead/readState`, "Read" label in thread |
| Typing indicators | `client.ts#sendTyping`, `ChannelHandler.onTypingStatusChanged` |
| Unread counts (`getTotalUnreadCount`, per-channel `unreadCount`, `clearUnreadCount`) | nav badge, channel list |
| Channel list (`createChannelsQuery`) | `components/chat/channel-list.tsx` |
| History pagination (`createMessagesQuery`) | `client.ts#createHistory`, `use-thread.ts#loadOlder` |
| Get messages by id | `client.ts#fetchById` |
| Presence (`subscribeEvent` ONLINE_STATUS, `getSubscribeUsersOnlineStatus`, `onSubscriptionChanged`) | `client.ts#watchPresence`, `providers.tsx#usePresence` |
| User blocklist (server) | `server.ts#addToBlocklist/removeFromBlocklist`, `api/blocks` |
| User profile update (server) | `server.ts#updateUserInfo` (name/avatar changes) |

All Nexconn ids are prefixed with `NEXCONN_ID_PREFIX` (`lgc`): users `lgcu<random>`, bots
`lgcbottutor<lang>` / `lgcbotroomhost`, rooms `lgcroom<lang><band><topic>`.

Switching Nexconn apps (new App Key) is safe: `api/nexconn/token` reissues a token cached for another
App Key and restores the learner's blocklist in the new app; `lib/server/rooms.ts#ensureRoom` recreates
a room's group and re-adds members when the group belongs to another App Key, and `joinRoom` retries once
after re-provisioning when Nexconn answers 25410 (group does not exist). Message history stays in the old
app.

## Environment variables (names only)
`DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `BLOB_READ_WRITE_TOKEN`, `NEXCONN_APP_KEY`,
`NEXCONN_APP_SECRET`, `NEXCONN_API_BASE`, `NEXCONN_ID_PREFIX`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`,
`CLERK_SECRET_KEY`, `GEMINI_API_KEY`,
`GEMINI_MODEL`, `GEMINI_FALLBACK_MODEL` (`GEMINI_EMBED_MODEL` is provisioned but unused).
The App Key reaches the browser only through `/api/nexconn/token`; the secret never leaves the server.

## Commands
```
npm install
vercel env pull .env.local --yes     # env for local dev
clerk env pull                       # Clerk keys (project linked with `clerk link`, app "LinguaChat")
npm run dev                          # http://localhost:3103
npm run typecheck && npm run lint && npm test
npm run db:generate                  # after editing src/db/schema.ts
npm run db:migrate                   # apply migrations (uses DATABASE_URL_UNPOOLED)
npm run e2e                          # against local dev (start it first)
E2E_BASE_URL=https://linguachat-chi.vercel.app npm run e2e   # against production
vercel deploy --prod                 # remote build, region sin1
```

## Conventions
- TypeScript strict; zod validation on every API input; every route checks the session and
  ownership/partnership/membership before acting. Route files export only handlers.
- Server-only modules import `server-only`. Shared pure logic lives in `src/lib/*.ts` and is unit tested.
- Gemini models come from env; every AI call goes through `lib/ai/gemini.ts` (timeouts, retries,
  fallback) and AI endpoints are rate limited per user (`rate_limits` table).
- Design ("airmail") tokens in `src/app/globals.css`: paper `#F3F5FB`, surface `#FFFFFF`, ink `#0F1A3D`,
  accent (airmail blue) `#2340C8`, red `#E23A4E` (mistakes, strikes, streak), marker (stamp marigold)
  `#F6B73C` (saved words, unread, highlights), mint `#138A5E` (online, success). No decorative gradients:
  the airmail stripe (`.airmail`) is used only around the landing demo and the closing invitation.
- Fonts: Bricolage Grotesque (`font-display`, headings and numbers), Atkinson Hyperlegible Next (UI),
  Literata (`font-pen`, corrected words and target-language words). Mistakes use `.strike`, fixes `.corrected`.
- Motion: user-triggered changes use `animate-ink-in` / `animate-pop-in`; the landing uses `<Reveal>` and
  one looping hero demo. Everything respects `prefers-reduced-motion`; `.reveal` has a no-JS fallback.
- Security headers (nosniff, frame DENY, referrer policy, permissions policy with microphone=self, HSTS)
  are set in `next.config.ts`.
- Commits end with the Claude co-author line; PRs are squash-merged.

## Testing
- Unit (vitest): `npm test` (12 tests).
- E2E (Playwright, `tests/e2e/tandem.spec.ts`): two browser contexts (Asha: Hindi → learning English,
  Ben: English → learning Hindi) are created via the Clerk Backend API (`+clerk_test` emails), signed
  in with a Clerk testing token (`tests/e2e/global-setup.ts` runs `clerkSetup()`), then onboard, match, request/accept, chat in real time,
  check before sending, receive AI coach notes via metadata on both sides, typing + read receipts,
  manual correction card, translate + word lookup + save, HD voice with transcript (fake mic plays
  `tests/e2e/fixtures/voice.wav`), SM-2 review, mistake log, AI tutor with streamed replies and
  hints, practice room with daily prompt, progress, block. Test accounts are deleted in `afterAll`.

## Known limitations
- Web clients don't receive server-sent `RC:StreamMsg` live, so the server sends an `LGC:Signal`
  with the message id and the client pulls the stream (`requestStreamMessage`). Long replies still
  appear progressively; very short ones can arrive as one chunk.
- Group channels only show messages sent after joining (Nexconn default); the daily prompt is
  therefore also pinned in the UI from the database.
- Reports are stored for moderation but there is no admin UI yet.
- Presence depends on Nexconn online-status subscriptions; "Active N min ago" comes from our
  heartbeat when someone is offline.
- SpeechSynthesis voices depend on the learner's OS/browser.
- Two React Compiler lint rules (`set-state-in-effect`, `preserve-manual-memoization`) are set to
  warnings; refactoring those effects is a follow-up.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
