import { useContext, createContext, useState } from "react";
import type { userModel, conversationModel } from "../../backend/db/schema";

type ActiveChat = userModel | conversationModel | null;
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
export function ActiveChatProvider(props: ActiveChatProviderProps) {
  const [activeChat, setActiveChat] = useState<ActiveChat>(null);
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
