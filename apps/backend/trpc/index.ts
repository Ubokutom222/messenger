import { initTRPC, TRPCError } from "@trpc/server";
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { getAuth } from "@clerk/express";
import { z } from "zod";
import db from "../db";
import * as schema from "../db/schema";
import {
  and,
  eq,
  ne,
  not,
  notInArray,
  inArray,
  type InferInsertModel,
  desc,
  lt,
} from "drizzle-orm";
import superjson from "superjson";
import { nanoid } from "nanoid";
export async function createContext(opts: CreateExpressContextOptions) {
  const session = getAuth(opts.req);
  return {
    ...session,
  };
}

type Context = Awaited<ReturnType<typeof createContext>>;
export const t = initTRPC.context<Context>().create({
  transformer: superjson,
});
const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.isAuthenticated) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "No Signed In User" });
  }

  return next({
    ctx: {
      session: ctx,
    },
  });
});
const baseProcedure = t.procedure;
export const appRouter = t.router({
  test: baseProcedure.query(() => {
    const returns = { message: "Sucessfull" };
    console.log(returns);
    return returns;
  }),
  testProtected: protectedProcedure.query(() => {
    const returns = { message: "Sucessfull" };
    console.log(returns);
    return returns;
  }),
  getOtherUsers: protectedProcedure
    .input(
      z.object({
        mode: z.enum(["CONV", "GROUP"]),
      }),
    )
    .query(async ({ ctx, input }) => {
      if (input.mode == "CONV") {
        try {
          // NOTE: First we find all convesation IDs where the current user is a member and the conversation is a direct message
          const existingConversations = await db
            .select({
              coversationId: schema.conversationMembers.conversationId,
            })
            .from(schema.conversationMembers)
            .innerJoin(
              schema.conversations,
              and(
                eq(
                  schema.conversationMembers.conversationId,
                  schema.conversations.id,
                ),
                eq(schema.conversations.isGroup, false),
              ),
            )
            .where(eq(schema.conversationMembers.userId, ctx.userId ?? ""));
          const conversationIds = existingConversations.map(
            (c) => c.coversationId,
          );

          // NOTE: We then find all users who share those conversations with the current user
          const otherUsers =
            conversationIds.length > 0
              ? await db
                  .select({ userId: schema.conversationMembers.userId })
                  .from(schema.conversationMembers)
                  .where(
                    and(
                      notInArray(
                        schema.conversationMembers.conversationId,
                        conversationIds,
                      ),
                      ne(schema.conversationMembers.userId, ctx.userId ?? ""),
                    ),
                  )
              : [];

          const excludedUserIds = [
            ctx.userId ?? "",
            ...otherUsers.map((u) => u.userId),
          ];

          // NOTE: WE now get all users excluding the current user and the users with existing conversations
          const availableUsers =
            excludedUserIds.length > 0
              ? await db
                  .select()
                  .from(schema.user)
                  .where(notInArray(schema.user.id, excludedUserIds))
              : await db
                  .select()
                  .from(schema.user)
                  .where(ne(schema.user.id, ctx.userId ?? ""));

          return availableUsers;
        } catch (error) {
          console.log("❌ Get Other Users Error: ", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Server Error",
          });
        }
      } else {
        try {
          const otherUser = await db
            .select()
            .from(schema.user)
            .where(not(eq(schema.user.id, ctx.userId ?? "")));
          return otherUser;
        } catch (error) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Server Error",
          });
        }
      }
    }),
  createGroup: protectedProcedure
    .input(
      z.object({
        name: z.string().nonoptional(),
        conversationMembers: z.array(
          z.object({
            id: z.string().nonoptional(),
            name: z.string().nonempty().nonoptional(),
            createdAt: z.date().nonoptional(),
            updatedAt: z.date().nonoptional(),
            email: z.string().nullish(),
            emailVerified: z.date().nonoptional(),
            image: z.string().nullish(),
            DOB: z.string().nullish(),
            phoneNumber: z.string().nullish(),
            username: z.string().nonoptional(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        console.log(input);
        const [me] = await db
          .select()
          .from(schema.user)
          .where(eq(schema.user.id, ctx.userId ?? ""));
        // Create a group conversation
        const [newConversation] = await db
          .insert(schema.conversations)
          .values({
            id: nanoid(),
            createdAt: new Date(),
            isGroup: true,
            name: input.name,
            updatedAt: new Date(),
          })
          .returning();

        const conversationMembers: Array<
          InferInsertModel<typeof schema.conversationMembers>
        > = [
          {
            userId: me!.id,
            conversationId: newConversation!.id,
            joinedAt: new Date(),
            role: "admin",
          },
        ];

        input.conversationMembers.forEach((item) => {
          conversationMembers.push({
            conversationId: newConversation!.id,
            userId: item.id,
            joinedAt: new Date(),
            role: "member",
          });
        });

        // Add Conversation Member to the just created Conversation
        const newMembers = await db
          .insert(schema.conversationMembers)
          .values(conversationMembers)
          .returning();

        console.log(newMembers);
        return {
          conversation: newConversation,
          conversationMembers: newMembers,
        };
      } catch (error) {
        console.log("❌ Create Group Error", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Server Error",
        });
      }
    }),
  getConversations: protectedProcedure.query(async ({ ctx }) => {
    try {
      const userId = ctx.userId ?? "";

      // 1) Get all conversations where the current user is a member
      const userConversations = await db
        .select({
          id: schema.conversations.id,
          isGroup: schema.conversations.isGroup,
          name: schema.conversations.name,
          createdAt: schema.conversations.createdAt,
          updatedAt: schema.conversations.updatedAt,
        })
        .from(schema.conversations)
        .innerJoin(
          schema.conversationMembers,
          eq(
            schema.conversations.id,
            schema.conversationMembers.conversationId,
          ),
        )
        .where(eq(schema.conversationMembers.userId, userId));

      const conversationIds = userConversations.map((c) => c.id);

      // 2) Fetch all members for the conversations found (including user details)
      const members =
        conversationIds.length > 0
          ? await db
              .select({
                conversationId: schema.conversationMembers.conversationId,
                userId: schema.conversationMembers.userId,
                role: schema.conversationMembers.role,
                joinedAt: schema.conversationMembers.joinedAt,
                user: schema.user,
              })
              .from(schema.conversationMembers)
              .leftJoin(
                schema.user,
                eq(schema.conversationMembers.userId, schema.user.id),
              )
              .where(
                inArray(
                  schema.conversationMembers.conversationId,
                  conversationIds,
                ),
              )
          : [];

      // 3) Group members by conversationId
      const membersByConversation: Record<string, Array<any>> = {};
      members.forEach((m) => {
        const convId = m.conversationId as string;
        if (!membersByConversation[convId]) membersByConversation[convId] = [];
        membersByConversation[convId].push(m);
      });

      // 4) Attach members to each conversation and return
      const results = userConversations.map((conv) => ({
        conversation: conv,
        conversationMembers: membersByConversation[conv.id] ?? [],
      }));

      return results;
    } catch (err) {
      console.log("❌ Get Conversations Error", err);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Server Error",
      });
    }
  }),
  sendTextMessage: protectedProcedure
    .input(
      z.object({
        conversationId: z.string().nullish(),
        recipientId: z.string().nullish(),
        content: z.string().nonempty().nonoptional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { conversationId, recipientId, content } = input;
      try {
        if (!conversationId && !recipientId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Missing Details",
          });
        }
        if (conversationId) {
          const newMessage = await db
            .insert(schema.messages)
            .values({
              id: nanoid(),
              conversationId,
              senderId: ctx.userId ?? "",
              content,
              createdAt: new Date(),
              isDeleted: false,
              messageType: "text",
              updatedAt: new Date(),
            })
            .returning();

          console.log("New Message Created", newMessage);
        }

        if (recipientId) {
          // Create a conversation
          const [newConversation] = await db
            .insert(schema.conversations)
            .values({
              id: nanoid(),
              createdAt: new Date(),
              isGroup: false,
              updatedAt: new Date(),
            })
            .returning();

          // Add Conversation members
          await db.insert(schema.conversationMembers).values([
            {
              userId: ctx.userId ?? "",
              conversationId: newConversation!.id ?? "",
              joinedAt: new Date(),
            },
            {
              userId: recipientId,
              conversationId: newConversation!.id ?? "",
              joinedAt: new Date(),
            },
          ]);

          // Send message
          const newMessage = await db
            .insert(schema.messages)
            .values({
              id: nanoid(),
              conversationId: newConversation?.id ?? "",
              senderId: ctx.userId ?? "",
              content,
              createdAt: new Date(),
              isDeleted: false,
              messageType: "text",
              updatedAt: new Date(),
            })
            .returning();

          console.log("New Message Created", newMessage);
        }
      } catch (err) {
        console.log("❌ Send Message Error", err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Server Error",
        });
      }
    }),
  getMessages: protectedProcedure
    .input(
      z.object({
        conversationId: z.string().nonoptional(),
        limit: z.number().min(1).max(50).default(50),
        cursor: z.iso.datetime().optional(),
      }),
    )
    .query(async ({ input }) => {
      const { conversationId, limit, cursor } = input;
      try {
        const rows = await db
          .select()
          .from(schema.messages)
          .where(
            cursor
              ? and(
                  eq(schema.messages.conversationId, conversationId),
                  lt(schema.messages.createdAt, new Date(cursor)),
                )
              : eq(schema.messages.conversationId, conversationId),
          )
          .orderBy(desc(schema.messages.createdAt))
          .limit(limit + 1);

        let nextCursor: string | undefined = undefined;

        if (rows.length > limit) {
          const nextItem = rows.pop();
          nextCursor = nextItem?.createdAt.toISOString();
        }

        return {
          messages: rows,
          nextCursor,
        };
      } catch (error) {
        console.log("❌ Get Messages Error", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Server Error",
        });
      }
    }),
});
// export type definition of API
export type AppRouter = typeof appRouter;
