export type { AppRouter } from "../../apps/backend/trpc";
import type {
  userModel,
  conversationModel,
} from "../../apps/backend/db/schema";
export type User = userModel;
export type Users = userModel[];
export type Conversation = conversationModel;
export type Conversations = conversationModel[];
