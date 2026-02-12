import express from "express";
import { clerkMiddleware } from "@clerk/express";
import { verifyWebhook } from "@clerk/express/webhooks";
import db from "./db";
import * as schema from "./db/schema";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";

const app = express();

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
    res.status(200).send({ received: true });
  } catch (error) {
    console.log(`❌ Clerk Wehbook Error: ${error}`);
    res.status(500).send({ messager: "Server Error" });
  }
});

app.listen(5000, () => {
  console.log("✅ Server is up and running");
});
