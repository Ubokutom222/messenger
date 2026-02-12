import {
  pgTable,
  text,
  timestamp,
  boolean,
  date,
  integer,
  varchar,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").notNull().primaryKey(),
  name: text("name").notNull(),
  email: text("email").unique(),
  emailVerified: timestamp("email_verified").notNull(),
  image: text("image"),
  DOB: date("DOB"),
  phoneNumber: text("phoneNumber").unique(),
  username: text("username").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const session = pgTable("session", {
  id: text("id").notNull().primaryKey(),
  expires: timestamp("expires").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").notNull().primaryKey(),
  userId: text("userId").notNull(),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("providerAccountId").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
  password: text("password"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  token: text("token").notNull(),
  value: text("value").notNull(),
  expires: timestamp("expires").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

// Conversations
export const conversations = pgTable("conversations", {
  id: text("id").primaryKey(), // integer
  isGroup: boolean("is_group").default(false).notNull(),
  name: varchar("name", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Conversation Members
export const conversationMembers = pgTable(
  "conversation_members",
  {
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }), // ✅ text -> text
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }), // ✅ text -> text
    role: varchar("role", { length: 50 }).default("member"),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.conversationId, t.userId] }),
    byUser: index("conversation_members_user_id_idx").on(t.userId),
    byConversation: index("conversation_members_conversation_id_idx").on(
      t.conversationId,
    ),
  }),
);

// Messages
export const messages = pgTable(
  "messages",
  {
    id: text("id").primaryKey(), // text
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }), // ✅ text -> text
    senderId: text("sender_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }), // ✅ text -> text

    content: text("content"),
    messageType: varchar("message_type", { length: 50 }).default("text"),

    mediaUrl: text("media_url"),
    mediaThumbnail: text("media_thumbnail"),
    mediaDuration: text("media_duration"),
    mediaSize: text("media_size"),
    mimeType: varchar("mime_type", { length: 100 }),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
    isDeleted: boolean("is_deleted").default(false),
  },
  (t) => ({
    byConversation: index("messages_conversation_id_idx").on(t.conversationId),
    byCreatedAt: index("messages_created_at_idx").on(t.createdAt),
  }),
);

// Message Receipts
export const messageReceipts = pgTable(
  "message_receipts",
  {
    messageId: text("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }), // ✅ text -> text
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }), // ✅ text -> text
    isDelivered: boolean("is_delivered").default(false),
    deliveredAt: timestamp("delivered_at"),
    isRead: boolean("is_read").default(false),
    readAt: timestamp("read_at"),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.messageId, t.userId] }),
    byUser: index("message_reciepts_user_id_idx").on(t.userId),
  }),
);
