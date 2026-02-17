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
  type InferInsertModel,
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
            name: z.string().nonoptional(),
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
        > = [];

        input.conversationMembers.forEach((item) => {
          conversationMembers.push({
            conversationId: newConversation!.id,
            userId: item.id,
            joinedAt: new Date(),
            role: item.id == ctx.userId ? "admin" : "member",
          });
        });

        // Add Conversation Member to the just created Conversation
        const newMembers = await db
          .insert(schema.conversationMembers)
          .values(conversationMembers)
          .returning();

        console.log(newMembers);
      } catch (error) {
        console.log("❌ Create Group Error", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Server Error",
        });
      }
    }),
});
// export type definition of API
export type AppRouter = typeof appRouter;
