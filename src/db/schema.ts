import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  bigserial,
} from "drizzle-orm/pg-core";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    displayName: text("display_name").notNull(),
    nexconnId: text("nexconn_id").notNull(),
    nexconnToken: text("nexconn_token"),
    /** App Key the token was issued for; a different key means the Nexconn app changed. */
    nexconnAppKey: text("nexconn_app_key"),
    avatarUrl: text("avatar_url"),
    bio: text("bio").notNull().default(""),
    nativeLanguages: text("native_languages").array().notNull().default(sql`'{}'::text[]`),
    targetLanguage: text("target_language"),
    targetLevel: text("target_level"),
    interests: text("interests").array().notNull().default(sql`'{}'::text[]`),
    goals: text("goals").array().notNull().default(sql`'{}'::text[]`),
    dailyTarget: integer("daily_target").notNull().default(20),
    timezone: text("timezone").notNull().default("UTC"),
    autoCorrect: boolean("auto_correct").notNull().default(true),
    ageConfirmedAt: timestamp("age_confirmed_at", { withTimezone: true }).notNull(),
    onboardedAt: timestamp("onboarded_at", { withTimezone: true }),
    lastActiveAt: timestamp("last_active_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("users_email_idx").on(t.email),
    uniqueIndex("users_nexconn_idx").on(t.nexconnId),
    index("users_target_idx").on(t.targetLanguage),
  ],
);

export const requestStatus = pgEnum("request_status", ["pending", "accepted", "declined", "cancelled"]);

export const chatRequests = pgTable(
  "chat_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fromUserId: uuid("from_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    toUserId: uuid("to_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    intro: text("intro").notNull().default(""),
    status: requestStatus("status").notNull().default("pending"),
    createdAt: createdAt(),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("chat_requests_pending_idx").on(t.fromUserId, t.toUserId).where(sql`status = 'pending'`),
    index("chat_requests_to_idx").on(t.toUserId, t.status),
  ],
);

/** An accepted tandem pair. user_low < user_high (uuid order) so each pair has one row. */
export const partnerships = pgTable(
  "partnerships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userLow: uuid("user_low").notNull().references(() => users.id, { onDelete: "cascade" }),
    userHigh: uuid("user_high").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("partnerships_pair_idx").on(t.userLow, t.userHigh)],
);

export const blocks = pgTable(
  "blocks",
  {
    blockerId: uuid("blocker_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    blockedId: uuid("blocked_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.blockerId, t.blockedId] })],
);

export const reportReason = pgEnum("report_reason", ["spam", "harassment", "inappropriate", "underage", "other"]);

export const reports = pgTable("reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  reporterId: uuid("reporter_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  reportedId: uuid("reported_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  reason: reportReason("reason").notNull(),
  details: text("details").notNull().default(""),
  createdAt: createdAt(),
});

export const vocabSource = pgEnum("vocab_source", ["chat", "tutor", "room", "manual"]);

export const vocabItems = pgTable(
  "vocab_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    language: text("language").notNull(),
    term: text("term").notNull(),
    termKey: text("term_key").notNull(),
    meaning: text("meaning").notNull(),
    partOfSpeech: text("part_of_speech").notNull().default(""),
    reading: text("reading").notNull().default(""),
    example: text("example").notNull().default(""),
    exampleTranslation: text("example_translation").notNull().default(""),
    source: vocabSource("source").notNull().default("manual"),
    ease: real("ease").notNull().default(2.5),
    intervalDays: integer("interval_days").notNull().default(0),
    repetitions: integer("repetitions").notNull().default(0),
    dueAt: timestamp("due_at", { withTimezone: true }).notNull().defaultNow(),
    lastReviewedAt: timestamp("last_reviewed_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("vocab_user_term_idx").on(t.userId, t.language, t.termKey),
    index("vocab_due_idx").on(t.userId, t.dueAt),
  ],
);

export const reviewLogs = pgTable("review_logs", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  vocabId: uuid("vocab_id").notNull().references(() => vocabItems.id, { onDelete: "cascade" }),
  grade: smallint("grade").notNull(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }).notNull().defaultNow(),
});

export const mistakeCategory = pgEnum("mistake_category", ["grammar", "vocabulary", "spelling", "word_order", "other"]);
export const mistakeSource = pgEnum("mistake_source", ["check", "auto", "partner", "tutor", "voice"]);

export const mistakes = pgTable(
  "mistakes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    language: text("language").notNull(),
    original: text("original").notNull(),
    corrected: text("corrected").notNull(),
    explanation: text("explanation").notNull().default(""),
    category: mistakeCategory("category").notNull().default("other"),
    tag: text("tag").notNull().default(""),
    source: mistakeSource("source").notNull(),
    messageId: text("message_id"),
    correctedBy: uuid("corrected_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [
    index("mistakes_user_idx").on(t.userId, t.createdAt),
    uniqueIndex("mistakes_msg_source_idx").on(t.userId, t.messageId, t.source).where(sql`message_id is not null`),
  ],
);

export const activityKind = pgEnum("activity_kind", [
  "message_target",
  "message_other",
  "correction_received",
  "correction_given",
  "word_saved",
  "review",
  "tutor_turn",
  "voice",
]);

export const activity = pgTable(
  "activity",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    kind: activityKind("kind").notNull(),
    language: text("language"),
    day: date("day").notNull(),
    ref: text("ref"),
    createdAt: createdAt(),
  },
  (t) => [
    index("activity_user_day_idx").on(t.userId, t.day),
    uniqueIndex("activity_ref_idx").on(t.userId, t.kind, t.ref).where(sql`ref is not null`),
  ],
);

export const tutorSessions = pgTable(
  "tutor_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    language: text("language").notNull(),
    level: text("level").notNull(),
    scenario: text("scenario").notNull(),
    title: text("title").notNull(),
    brief: text("brief").notNull().default(""),
    turns: integer("turns").notNull().default(0),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    lastTurnAt: timestamp("last_turn_at", { withTimezone: true }),
  },
  (t) => [index("tutor_sessions_user_idx").on(t.userId, t.startedAt)],
);

export const tutorRole = pgEnum("tutor_role", ["learner", "tutor"]);

export const tutorTurns = pgTable(
  "tutor_turns",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    sessionId: uuid("session_id").notNull().references(() => tutorSessions.id, { onDelete: "cascade" }),
    role: tutorRole("role").notNull(),
    text: text("text").notNull(),
    messageId: text("message_id"),
    createdAt: createdAt(),
  },
  (t) => [index("tutor_turns_session_idx").on(t.sessionId, t.id)],
);

export const rooms = pgTable(
  "rooms",
  {
    id: text("id").primaryKey(),
    groupId: text("group_id").notNull(),
    language: text("language").notNull(),
    band: text("band").notNull(),
    topic: text("topic").notNull(),
    name: text("name").notNull(),
    /** App Key the Nexconn group was created in (re-provisioned when the app changes). */
    nexconnAppKey: text("nexconn_app_key"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("rooms_group_idx").on(t.groupId)],
);

export const roomMembers = pgTable(
  "room_members",
  {
    roomId: text("room_id").notNull().references(() => rooms.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.roomId, t.userId] }), index("room_members_user_idx").on(t.userId)],
);

export const roomPrompts = pgTable(
  "room_prompts",
  {
    roomId: text("room_id").notNull().references(() => rooms.id, { onDelete: "cascade" }),
    day: date("day").notNull(),
    prompt: text("prompt").notNull().default(""),
    hint: text("hint").notNull().default(""),
    messageId: text("message_id"),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.roomId, t.day] })],
);

export const aiCache = pgTable("ai_cache", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  createdAt: createdAt(),
});

export const rateLimits = pgTable(
  "rate_limits",
  {
    key: text("key").notNull(),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    count: integer("count").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.key, t.windowStart] })],
);

export type User = typeof users.$inferSelect;
export type VocabItem = typeof vocabItems.$inferSelect;
export type Mistake = typeof mistakes.$inferSelect;
