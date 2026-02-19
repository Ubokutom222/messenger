export type { AppRouter } from "../../apps/backend/trpc";
import type {
  userModel,
  conversationModel,
  conversationMembersModel,
} from "../../apps/backend/db/schema";
export type User = userModel;
export type Users = userModel[];
export type Conversation = {
  conversation: conversationModel;
  conversationMembers?: Array<conversationMembersModel>;
};
export type Conversations = Conversation[];
