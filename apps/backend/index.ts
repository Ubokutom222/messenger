import express from "express";
import { clerkMiddleware, getAuth } from "@clerk/express";
import { verifyWebhook } from "@clerk/express/webhooks";
import db from "./db";
import * as schema from "./db/schema";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import * as trpcExpress from "@trpc/server/adapters/express";
import { appRouter, createContext } from "./trpc";
import { createServer } from "http";
import { Server } from "socket.io";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  /* options */
});

app.use(express.json());

app.use(clerkMiddleware());

app.get("/test", (req, res) => {
  console.log(req);
  res.status(200).send({ message: "Sucessfuull" });
});

app.post("/clerk/webhook", async (req, res) => {
  try {
    const event = await verifyWebhook(req, {
      signingSecret: process.env.CLERK_SIGNING_SECRET!,
    });

    switch (event.type) {
      case "user.created":
        const { data } = event;
        const newUser = await db
          .insert(schema.user)
          .values({
            id: data.id,
            email: data.email_addresses[0]?.email_address,
            emailVerified: new Date(),
            name: `${data.first_name} ${data.last_name}`,
            username: data.username ?? "",
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();
        console.log("✅ New User Created", newUser);
        break;
      case "user.updated":
        const { data: userUpdatedData } = event;
        const updatedUser = await db
          .update(schema.user)
          .set({
            createdAt: new Date(userUpdatedData.created_at),
            username: userUpdatedData.username ?? "",
            email: userUpdatedData.email_addresses[0]?.email_address,
            emailVerified: new Date(userUpdatedData.created_at),
            image: userUpdatedData.image_url,
            updatedAt: new Date(),
            name: `${userUpdatedData.first_name} ${userUpdatedData.last_name}`,
          })
          .where(eq(schema.user.id, userUpdatedData.id))
          .returning();
        console.log("A user was updated:", updatedUser);
        break;
      case "user.deleted":
        const { data: userDeletedData } = event;
        console.log(JSON.stringify(userDeletedData, null, 2));
        const deletedUser = await db
          .delete(schema.user)
          .where(eq(schema.user.id, userDeletedData.id ?? ""))
          .returning();
        console.log("A user was deleted:", deletedUser);
        break;
      case "session.created":
        const { data: sessionCreatedData } = event;
        const newSession = await db
          .insert(schema.session)
          .values({
            id: nanoid(),
            expires: new Date(sessionCreatedData.expire_at),
            userId: sessionCreatedData.user_id,
            ipAddress: event.event_attributes.http_request.client_ip,
            userAgent: event.event_attributes.http_request.user_agent,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();
        console.log("✅ New Session Created", newSession);
        break;
      case "session.ended":
        console.log("Session ended");
        break;
      case "session.removed":
        console.log("Session had been removed");
        break;
      default:
        console.log("Unhandled event type:", event.type);
    }
    res.status(200).send("Webhook recieved");
  } catch (error) {
    console.log(`❌ Clerk Wehbook Error: ${error}`);
    res.status(500).send("Server Error");
  }
});

app.use(
  "/trpc",
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext,
  }),
);

io.on("connection", (socket) => {
  console.log(`✅ User connected: ${socket.id}`);

  /**
   * Event: User joins a room
   *
   * The idea:
   * When a user opens a conversation/DM, they emit "join-room" with:
   * - roomName: unique identifier for the chat (e.g., "conversation-123" or "dm-user1-user2")
   * - userId: their user ID
   * - chatDetails: the conversation or user object with member info
   *
   * We:
   * 1. Add them to the socket.io room (socket.join() automatically manages room subscriptions)
   * 2. Store their user info for later reference
   * 3. Broadcast "user-joined" to all others in the room so they see the presence indicator
   */
  socket.on(
    "join-room",
    (data: { roomName: string; userId: string; chatDetails: any }) => {
      const { roomName, userId, chatDetails } = data;

      console.log(`📍 ${userId} joining room: ${roomName}`);
      socket.join(roomName);

      // Attach user metadata to socket for future reference
      (socket.data as any).userId = userId;
      (socket.data as any).roomName = roomName;

      // Broadcast to all users in room (except sender) that someone joined
      socket.to(roomName).emit("user-joined", {
        userId,
        roomName,
        timestamp: new Date().toISOString(),
      });

      // Send current room members count to the joining user
      const roomSockets = io.sockets.adapter.rooms.get(roomName);
      socket.emit("room-info", {
        memberCount: roomSockets?.size ?? 1,
        roomName,
      });
    },
  );

  /**
   * Event: User leaves a room
   *
   * The idea:
   * When a user closes a conversation or switches to another chat, they emit "leave-room".
   * We:
   * 1. Remove them from the socket.io room (socket.leave() handles this)
   * 2. Broadcast "user-left" to remaining members
   * 3. If no members remain, optionally clean up room (socket.io does this automatically, but we can add custom logic)
   */
  socket.on("leave-room", (data: { roomName: string }) => {
    const { roomName } = data;
    const userId = (socket.data as any).userId;

    console.log(`🚪 ${userId} leaving room: ${roomName}`);
    socket.leave(roomName);

    // Broadcast to all remaining users in room that someone left
    socket.to(roomName).emit("user-left", {
      userId,
      roomName,
      timestamp: new Date().toISOString(),
    });

    // Check if room is now empty
    const roomSockets = io.sockets.adapter.rooms.get(roomName);
    if (!roomSockets || roomSockets.size === 0) {
      console.log(`🧹 Room "${roomName}" is now empty, cleaning up`);
      // Optional: Emit cleanup event to database or cache to remove old messages
      // await db.delete(schema.messageCache).where(eq(schema.messageCache.roomName, roomName));
    }
  });

  /**
   * Event: User sends a message
   *
   * The idea:
   * When a user types and sends a message in a conversation:
   * 1. We receive the message data from the sender
   * 2. We save it to the database
   * 3. We broadcast it to ALL users in the room (including sender)
   * 4. The sender sees their message appear in real-time
   * 5. Other users in the room instantly see the new message
   *
   * This creates a seamless real-time chat experience where
   * messages appear immediately without needing to refresh.
   */
  socket.on(
    "send-message",
    async (data: {
      roomName: string;
      userId: string;
      content: string;
      conversationId?: string;
    }) => {
      const { roomName, userId, content, conversationId } = data;

      try {
        console.log(`💬 Message from ${userId} in ${roomName}: ${content}`);

        // Save message to database (optional - depends on your TRPC setup)
        // const newMessage = await db
        //   .insert(schema.message)
        //   .values({
        //     id: nanoid(),
        //     content,
        //     senderId: userId,
        //     conversationId: conversationId || "",
        //     createdAt: new Date(),
        //   })
        //   .returning();

        // Broadcast message to ALL users in room (including sender)
        // This ensures everyone sees the message in sync
        io.to(roomName).emit("message-received", {
          roomName,
          userId,
          content,
          timestamp: new Date().toISOString(),
          // messageId: newMessage[0]?.id, // If saving to DB
        });
      } catch (error) {
        console.error(`❌ Error sending message: ${error}`);
        socket.emit("message-error", {
          error: "Failed to send message",
          timestamp: new Date().toISOString(),
        });
      }
    },
  );

  /**
   * Event: User is typing indicator
   *
   * The idea:
   * When a user starts typing in the message input:
   * 1. They emit "typing-indicator" with their userId
   * 2. We broadcast it to others in the room (NOT back to sender)
   * 3. Others see "User is typing..." indicator
   * 4. When they send the message or stop typing, they emit "stop-typing"
   * 5. The indicator disappears
   *
   * This creates a smooth UX where users know when someone is composing.
   * We use socket.to() to exclude the sender from receiving their own indicator.
   */
  socket.on(
    "typing-indicator",
    (data: { roomName: string; userId: string; userName: string }) => {
      const { roomName, userId, userName } = data;

      console.log(`✏️ ${userName} is typing in ${roomName}`);

      // Broadcast to all OTHER users in room (not sender)
      // socket.to() = send to everyone EXCEPT sender
      socket.to(roomName).emit("user-typing", {
        userId,
        userName,
        roomName,
        timestamp: new Date().toISOString(),
      });
    },
  );

  /**
   * Event: User stops typing
   *
   * The idea:
   * When the user stops typing (either sends message or deletes all text),
   * we emit "stop-typing" to others so they can hide the typing indicator.
   */
  socket.on("stop-typing", (data: { roomName: string; userId: string }) => {
    const { roomName, userId } = data;

    console.log(`⏸️ ${userId} stopped typing in ${roomName}`);

    socket.to(roomName).emit("user-stopped-typing", {
      userId,
      roomName,
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * Event: Socket disconnect
   *
   * The idea:
   * If a user loses connection (closes app, loses internet, etc.),
   * we automatically:
   * 1. Leave their room
   * 2. Notify others they're offline
   * 3. Clear their typing indicator (if they were typing)
   *
   * Socket.io automatically removes the socket from all rooms.
   */
  socket.on("disconnect", () => {
    const userId = (socket.data as any).userId;
    const roomName = (socket.data as any).roomName;

    console.log(`❌ User disconnected: ${userId} from room: ${roomName}`);

    if (roomName) {
      // Notify others in room that user left
      socket.to(roomName).emit("user-left", {
        userId,
        roomName,
        timestamp: new Date().toISOString(),
      });

      // Also clear typing indicator in case they were typing when disconnected
      socket.to(roomName).emit("user-stopped-typing", {
        userId,
        roomName,
        timestamp: new Date().toISOString(),
      });
    }
  });
});

httpServer.listen(5000);
