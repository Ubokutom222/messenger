import { useContext, createContext, useState, useEffect } from "react";
import type { User, Conversation } from "@messenger/types";
import socket from "@/sockets";
import { useAuth } from "@clerk/clerk-expo";

type ActiveChat = User | Conversation | null;
interface ActiveChatContextProps {
  activeChat: ActiveChat;
  setActiveChat: (param: ActiveChat) => void;
}

const ActiveChatContext = createContext<ActiveChatContextProps | undefined>(
  undefined,
);

interface ActiveChatProviderProps {
  children: React.ReactNode;
}

/**
 * Helper function to determine if activeChat is a Conversation
 */
function isConversation(chat: ActiveChat): chat is Conversation {
  return chat !== null && "conversation" in chat;
}

/**
 * Helper function to get room name for a chat
 * For conversations: "conversation-{conversationId}"
 * For direct messages: "dm-{userId1}-{userId2}" (sorted alphabetically for consistency)
 */
function getRoomName(chat: ActiveChat, currentUserId: string): string | null {
  if (!chat) return null;

  if (isConversation(chat)) {
    return `conversation-${chat.conversation.id}`;
  } else {
    // Direct message room between two users
    const ids = [currentUserId, chat.id].sort();
    return `dm-${ids[0]}-${ids[1]}`;
  }
}

export function ActiveChatProvider(props: ActiveChatProviderProps) {
  const { userId } = useAuth();
  const [activeChat, setActiveChat] = useState<ActiveChat>(null);
  const [currentRoomName, setCurrentRoomName] = useState<string | null>(null);

  /**
   * Effect: Handle room subscription changes
   *
   * The idea:
   * 1. When activeChat changes, we calculate the new room name
   * 2. We leave the old room (if one exists) to clean up subscriptions
   * 3. We join the new room and emit a "user-joined" event so others know we're online
   * 4. When the component unmounts or userId changes, we clean up by leaving the room
   */
  useEffect(() => {
    if (!userId) return;

    const newRoomName = getRoomName(activeChat, userId);

    // Leave old room if it exists and is different from new room
    if (currentRoomName && currentRoomName !== newRoomName) {
      socket.emit("leave-room", { roomName: currentRoomName });
    }

    // Join new room if one exists
    if (newRoomName) {
      socket.emit("join-room", {
        roomName: newRoomName,
        userId,
        chatDetails: activeChat, // Send full chat details so backend knows members
      });
      setCurrentRoomName(newRoomName);
    } else {
      setCurrentRoomName(null);
    }

    // Cleanup on unmount or when activeChat becomes null
    return () => {
      if (newRoomName) {
        socket.emit("leave-room", { roomName: newRoomName });
      }
    };
  }, [activeChat, userId]);

  return (
    <ActiveChatContext.Provider value={{ activeChat, setActiveChat }}>
      {props.children}
    </ActiveChatContext.Provider>
  );
}

export function useActiveChat() {
  const context = useContext(ActiveChatContext);
  if (!context) {
    throw new Error("useActiveChat must be used within an ActiveChatProvider");
  }
  return context;
}
