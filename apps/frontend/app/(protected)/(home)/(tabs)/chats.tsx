import { View, KeyboardAvoidingView, Platform } from "react-native";
import React from "react";
import { Button, ButtonText } from "@/components/ui/button";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useRouter } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { useActiveChat } from "@/providers/ActiveChatProvider";
import { Input, InputField } from "@/components/ui/input";
import { BackHandler } from "react-native";
import { useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc";
import { ScrollView } from "react-native-gesture-handler";
import { VStack } from "@/components/ui/vstack";
import { Pressable } from "react-native";
import { Box } from "@/components/ui/box";
import {
  Avatar,
  AvatarFallback,
  AvatarFallbackText,
  AvatarImage,
} from "@/components/ui/avatar";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import {
  Toast,
  ToastTitle,
  ToastDescription,
  useToast,
} from "@/components/ui/toast";
import socket from "@/sockets";
import type { Message } from "@messenger/types";

export default function Chats() {
  const router = useRouter();
  const { signOut } = useAuth();
  const { activeChat, setActiveChat } = useActiveChat();
  const trpc = useTRPC();
  const { userId } = useAuth();
  const isChatSelected = React.useMemo(() => {
    return !!activeChat;
  }, [activeChat]);

  React.useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (isChatSelected) {
          setActiveChat(null);
          return true;
        }
        return false;
      },
    );
    return () => backHandler.remove();
  }, [isChatSelected, setActiveChat]);

  const [content, setContent] = React.useState<string>("");
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = React.useState<Set<string>>(new Set());
  const typingTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const sendMessageMutation = useMutation(
    trpc.sendTextMessage.mutationOptions(),
  );

  /**
   * Handle message sending
   *
   * The idea:
   * 1. When user presses "Submit", we call handleSend()
   * 2. We emit the message to the backend via socket
   * 3. We also call the TRPC mutation to save to database
   * 4. We emit "stop-typing" to clear typing indicator
   * 5. Clear the input field
   */
  async function handleSend() {
    if (!activeChat || !content.trim()) return;

    const roomName =
      "conversation" in activeChat
        ? `conversation-${activeChat.conversation.id}`
        : `dm-${[userId, activeChat.id].sort().join("-")}`;

    // Send message via socket.io for real-time broadcast
    socket.emit("send-message", {
      roomName,
      userId,
      content,
      conversationId:
        "conversation" in activeChat ? activeChat.conversation.id : undefined,
    });

    // Also save to database via TRPC
    const otherId =
      "conversation" in activeChat
        ? { conversationId: activeChat.conversation.id }
        : { recipientId: activeChat.id };

    await sendMessageMutation.mutateAsync({
      content,
      ...otherId,
    });

    // Clear typing indicator
    socket.emit("stop-typing", { roomName, userId });

    setContent("");
  }

  /**
   * Handle typing indicator
   *
   * The idea:
   * 1. When user starts typing, emit "typing-indicator"
   * 2. Debounce: only emit every 300ms to avoid spam
   * 3. When input becomes empty or user stops typing for 1 second,
   *    emit "stop-typing"
   * 4. This gives smooth UX without overwhelming the server
   */
  function handleContentChange(value: string) {
    setContent(value);

    if (!activeChat) return;

    const roomName =
      "conversation" in activeChat
        ? `conversation-${activeChat.conversation.id}`
        : `dm-${[userId, activeChat.id].sort().join("-")}`;

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Emit typing indicator only if content is not empty
    if (value.trim()) {
      socket.emit("typing-indicator", {
        roomName,
        userId,
        userName: "User", // TODO: Get actual user name from auth
      });

      // Auto stop typing after 1 second of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("stop-typing", { roomName, userId });
      }, 1000);
    } else {
      // Empty input = stop typing
      socket.emit("stop-typing", { roomName, userId });
    }
  }

  /**
   * Listen for incoming messages from socket.io
   *
   * The idea:
   * 1. When backend broadcasts "message-received", we receive it
   * 2. We add the message to our local messages state
   * 3. This updates the UI immediately with the new message
   * 4. When the chat changes, we clear the local messages to avoid stale data
   */
  React.useEffect(() => {
    socket.on("message-received", (data) => {
      console.log("📨 Message received:", data);
      setMessages((prev) => [
        ...prev,
        {
          id: data.messageId || Date.now().toString(),
          content: data.content,
          senderId: data.userId,
          conversationId: data.conversationId || "",
          createdAt: new Date(data.timestamp),
          updatedAt: new Date(data.timestamp),
        } as Message,
      ]);
    });

    return () => {
      socket.off("message-received");
    };
  }, []);

  /**
   * Clear messages when chat changes
   * This prevents showing stale messages from a different conversation
   */
  React.useEffect(() => {
    console.log(messages);
    setMessages([]);
  }, [activeChat]);

  /**
   * Listen for typing indicators
   *
   * The idea:
   * 1. When another user emits "typing-indicator", we receive "user-typing"
   * 2. We add them to the typingUsers Set
   * 3. We show "User is typing..." indicator
   * 4. When they emit "stop-typing", we remove them from the Set
   */
  React.useEffect(() => {
    socket.on("user-typing", (data) => {
      console.log(`✏️ ${data.userName} is typing`);
      setTypingUsers((prev) => new Set([...prev, data.userId]));
    });

    socket.on("user-stopped-typing", (data) => {
      console.log(`⏸️ ${data.userId} stopped typing`);
      setTypingUsers((prev) => {
        const updated = new Set(prev);
        updated.delete(data.userId);
        return updated;
      });
    });

    return () => {
      socket.off("user-typing");
      socket.off("user-stopped-typing");
    };
  }, []);

  /**
   * Helper function to combine database messages with real-time socket messages
   * Deduplicates by message ID and sorts by timestamp
   */
  function getCombinedMessages(): Message[] {
    const dbMessages =
      messagesData?.pages?.flatMap((page) => page.messages) ?? [];
    const allMessages = [...dbMessages, ...messages];

    // Deduplicate using Map (last occurrence wins)
    const uniqueMessages = Array.from(
      new Map(allMessages.map((msg) => [msg.id, msg])).values(),
    );

    // Sort by creation date (oldest first)
    return uniqueMessages.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  }
  const {
    data: messagesData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery(
    trpc.getMessages.infiniteQueryOptions(
      {
        conversationId: !!activeChat
          ? "conversation" in activeChat
            ? activeChat.conversation.id
            : ""
          : "",
        limit: 5,
      },
      { getNextPageParam: (lastPage) => lastPage.nextCursor },
    ),
  );

  const toast = useToast();
  const [toastId, setToastId] = React.useState(0);

  function handleToast(
    type: "error" | "success" | "warning" | "info" | "muted",
    message: string,
  ) {
    if (!toast.isActive(toastId.toString())) {
      showNewToast(type, message);
    }
  }

  function showNewToast(
    type: "error" | "success" | "warning" | "info" | "muted",
    message: string,
  ) {
    const newId = Math.random();
    setToastId(newId);
    toast.show({
      id: newId.toString(),
      placement: "top",
      duration: 3000,
      render({ id }) {
        const uniqueToastId = "toast" + id;
        return (
          <Toast nativeID={uniqueToastId} action={type} variant="solid">
            <ToastTitle>{type.toUpperCase()}</ToastTitle>
            <ToastDescription>{message}</ToastDescription>
          </Toast>
        );
      },
    });
  }

  const { isFetching, data } = useQuery(trpc.getConversations.queryOptions());

  if (isChatSelected) {
    const combinedMessages = getCombinedMessages();

    return (
      <View className="flex-1">
        <ScrollView className="flex-1 pb-4">
          <VStack className="gap-2 px-4">
            {/* @ts-ignore */}
            {"conversation" in activeChat && activeChat.conversation.isGroup ? (
              isLoading ? (
                <Spinner size="large" />
              ) : combinedMessages.length > 0 ? (
                combinedMessages.map((message) => (
                  <Box
                    key={message.id}
                    className={`flex-row ${message.senderId === userId ? "justify-end" : "justify-start"} items-end gap-2`}
                  >
                    {message.senderId !== userId && (
                      <Text className="text-accent-foreground text-xs mb-2">
                        {activeChat.conversationMembers
                          ?.filter((user) => user.userId == message.senderId)[0]
                          .user?.name.split(" ")[0]
                          .toUpperCase()}
                      </Text>
                    )}
                    <Box
                      className={`max-w-xs rounded-lg px-4 py-2 ${
                        message.senderId === userId
                          ? "bg-primary"
                          : "bg-secondary"
                      }`}
                    >
                      <Text className="text-white">{message.content}</Text>
                    </Box>
                  </Box>
                ))
              ) : null
            ) : isLoading ? (
              <Spinner size="large" />
            ) : combinedMessages.length > 0 ? (
              combinedMessages.map((message) => (
                <Box
                  key={message.id}
                  className={`flex-row ${
                    message.senderId === userId
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >
                  <Box
                    className={`max-w-xs rounded-lg px-4 py-2 ${
                      message.senderId === userId
                        ? "bg-primary"
                        : "bg-secondary"
                    }`}
                  >
                    <Text className="text-white">{message.content}</Text>
                  </Box>
                </Box>
              ))
            ) : null}

            {/* Display typing indicator */}
            {typingUsers.size > 0 && (
              <Box className="flex-row items-center gap-2">
                <Spinner size="small" />
                <Text className="text-accent-foreground text-sm italic">
                  {typingUsers.size === 1 ? "User" : "Users"} typing...
                </Text>
              </Box>
            )}

            {/* {hasNextPage && (
              <Button onPress={() => fetchNextPage()}>
                <ButtonText>Load More</ButtonText>
              </Button>
            )} */}
          </VStack>
        </ScrollView>
        <KeyboardAvoidingView
          behavior={Platform.OS == "android" ? "height" : "padding"}
        >
          <View className="w-full flex flex-row py-2 gap-2">
            <Button>
              <ButtonText>Media</ButtonText>
            </Button>
            <Input className="flex-1">
              <InputField
                value={content}
                onChangeText={handleContentChange}
                placeholder="Type a message..."
              />
            </Input>
            <Button onPress={() => handleSend()}>
              <ButtonText>Submit</ButtonText>
            </Button>
          </View>
        </KeyboardAvoidingView>
      </View>
    );
  }
  return (
    <View className="relative flex-1">
      <Button
        className="absolute right-8 bottom-16 rounded-full z-50"
        onPress={() => router.push("/(protected)/(home)/new-chat")}
      >
        <FontAwesome name="plus" size={32} />
      </Button>
      {isFetching ? (
        <View className="flex-1 flex items-center justify-center">
          <Spinner size="large" />
        </View>
      ) : (
        <View className="flex-1 mt-4">
          <ScrollView className="flex-1">
            <VStack className="flex-1 gap-2">
              {data?.map((item, index) => (
                <Pressable
                  key={index}
                  onPress={() => {
                    setActiveChat(item);
                  }}
                >
                  <Box className="rounded-full bg-gray-700/50 p-6 flex-row items-center justify-between">
                    <Avatar>
                      <AvatarImage
                        src={
                          item.conversationMembers.filter(
                            (item) => item.user.id !== userId,
                          )[0].user.image ?? undefined
                        }
                      />
                      <AvatarFallback>
                        <AvatarFallbackText>Image</AvatarFallbackText>
                      </AvatarFallback>
                    </Avatar>
                    <Text className="text-semibold text-white text-lg flex-1">
                      {item.conversation.isGroup
                        ? item.conversation.name
                        : item.conversationMembers
                            .filter((item) => item.user.id !== userId)[0]
                            .user.name.split(" ")[0]
                            .toUpperCase()}
                    </Text>
                  </Box>
                </Pressable>
              ))}
            </VStack>
          </ScrollView>
        </View>
      )}
      <Button onPress={signOut}>
        <ButtonText>Sign Out</ButtonText>
      </Button>
    </View>
  );
}

// const { data, isFetching } = useQuery(trpc.getConversations.queryOptions());
// const {
//   data: messagesData,
//   fetchNextPage,
//   hasNextPage,
//   isFetchingNextPage,
//   isLoading,
// } = useInfiniteQuery(
//   trpc.getMessages.infiniteQueryOptions(
//     {
//       conversationId: !!activeChat
//         ? "conversation" in activeChat
//           ? activeChat.conversation.id
//           : ""
//         : "",
//       limit: 5,
//     },
//     { getNextPageParam: (lastPage) => lastPage.nextCursor },
//   ),
// );

// const toast = useToast()
// const [toastId, setToastId] = React.useState(0)

// function handleToast(type: "error" | "success" | "warning" | "info" | "muted", message: string) {
//   if (!toast.isActive(toastId.toString())) {
//     showNewToast(type, message)
//   }
// }

// function showNewToast(type: "error" | "success" | "warning" | "info" | "muted", message: string) {
//   const newId = Math.random()
//   setToastId(newId)
//   toast.show({
//     id: newId.toString(),
//     placement: "top",
//     duration: 3000,
//     render({ id }) {
//       const uniqueToastId = "toast" + id
//       return (
//         <Toast nativeID={uniqueToastId} action={type} variant="solid">
//           <ToastTitle>{type.toUpperCase()}</ToastTitle>
//           <ToastDescription>{message}</ToastDescription>
//         </Toast>
//       )
//     }
//   })
// }

// if (isChatSelected) {
//   return (
//     <View className="flex-1">
//       <ScrollView className="flex-1 pb-4">
//         <VStack className="gap-2 px-4">
//           {/* @ts-ignore */}
//           {("conversation" in activeChat && activeChat.conversation.isGroup) ? isLoading ? (
//             <Spinner size="large" />
//           ) : messagesData?.pages ? (
//             [...messagesData.pages]
//               // .reverse()
//               .flatMap((page) => page.messages)
//               .map((message) => (
//                 <Box
//                   key={message.id}
//                   className={`flex-row ${message.senderId === userId ? "justify-end" : "justify-start"} items-end gap-2`}
//                 >
//                   {message.senderId !== userId && (
//                     <Text className="text-accent-foreground text-xs mb-2">
//                       {activeChat.conversationMembers?.filter((user) => user.userId == message.senderId)[0].user?.name.split(" ")[0].toUpperCase()}
//                     </Text>
//                   )}
//                   <Box
//                     className={`max-w-xs rounded-lg px-4 py-2 ${message.senderId === userId
//                       ? "bg-primary"
//                       : "bg-secondary"
//                       }`}
//                   >
//                     <Text className="text-white">{message.content}</Text>
//                   </Box>
//                 </Box>
//               ))
//           ) : null : isLoading ? (
//             <Spinner size="large" />
//           ) : messagesData?.pages ? (
//             [...messagesData.pages]
//               .reverse()
//               .flatMap((page) => page.messages)
//               .map((message) => (
//                 <Box
//                   key={message.id}
//                   className={`flex-row ${message.senderId === userId ? "justify-end" : "justify-start"
//                     }`}
//                 >
//                   <Box
//                     className={`max-w-xs rounded-lg px-4 py-2 ${message.senderId === userId
//                       ? "bg-primary"
//                       : "bg-secondary"
//                       }`}
//                   >
//                     <Text className="text-white">{message.content}</Text>
//                   </Box>
//                 </Box>
//               ))
//           ) : null}
//           {/* {hasNextPage && (
//               <Button onPress={() => fetchNextPage()}>
//                 <ButtonText>Load More</ButtonText>
//               </Button>
//             )} */}
//         </VStack>
//       </ScrollView>
//       <KeyboardAvoidingView
//         behavior={Platform.OS == "android" ? "height" : "padding"}
//       >
//         <View className="w-full flex flex-row py-2 gap-2">
//           <Button>
//             <ButtonText>Media</ButtonText>
//           </Button>
//           <Input className="flex-1">
//             <InputField
//               value={content}
//               onChangeText={(value) => setContent(value)}
//             />
//           </Input>
//           <Button onPress={() => handleSend()}>
//             <ButtonText>Submit</ButtonText>
//           </Button>
//         </View>
//       </KeyboardAvoidingView>
//     </View>
//   );
// }
// return (
//   <View className="relative flex-1">
//     <Button
//       className="absolute right-8 bottom-16 rounded-full z-50"
//       onPress={() => router.push("/(protected)/(home)/new-chat")}
//     >
//       <FontAwesome name="plus" size={32} />
//     </Button>
//     {isFetching ? (
//       <View className="flex-1 flex items-center justify-center">
//         <Spinner size="large" />
//       </View>
//     ) : (
//       <View className="flex-1 mt-4">
//         <ScrollView className="flex-1">
//           <VStack className="flex-1 gap-2">
//             {data?.map((item, index) => (
//               <Pressable
//                 key={index}
//                 onPress={() => {
//                   setActiveChat(item);
//                 }}
//               >
//                 <Box className="rounded-full bg-gray-700/50 p-6 flex-row items-center justify-between">
//                   <Avatar>
//                     <AvatarImage
//                       src={
//                         item.conversationMembers.filter(
//                           (item) => item.user.id !== userId,
//                         )[0].user.image ?? undefined
//                       }
//                     />
//                     <AvatarFallback>
//                       <AvatarFallbackText>Image</AvatarFallbackText>
//                     </AvatarFallback>
//                   </Avatar>
//                   <Text className="text-semibold text-white text-lg flex-1">
//                     {item.conversation.isGroup
//                       ? item.conversation.name
//                       : item.conversationMembers
//                         .filter((item) => item.user.id !== userId)[0]
//                         .user.name.split(" ")[0]
//                         .toUpperCase()}
//                   </Text>
//                 </Box>
//               </Pressable>
//             ))}
//           </VStack>
//         </ScrollView>
//       </View>
//     )}
//     <Button onPress={signOut}>
//       <ButtonText>Sign Out</ButtonText>
//     </Button>
//   </View>
// );
// }
