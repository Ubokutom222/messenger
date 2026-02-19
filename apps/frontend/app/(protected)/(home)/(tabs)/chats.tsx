import { View, Text, KeyboardAvoidingView, Platform } from "react-native";
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
          return false;
        }
        return true;
      },
    );
    return () => backHandler.remove();
  }, [isChatSelected]);

  const [content, setContent] = React.useState<string>("");

  const sendMessageMutation = useMutation(
    trpc.sendTextMessage.mutationOptions(),
  );

  async function handleSend() {
    if (!activeChat) return;
    const otherId =
      "conversation" in activeChat
        ? { conversationId: activeChat.conversation.id }
        : { recipientId: activeChat.id };
    await sendMessageMutation.mutateAsync({
      content,
      ...otherId,
    });
    setContent("");
  }

  const { data, isFetching } = useQuery(trpc.getConversations.queryOptions());
  const {
    data: messagesData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
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

  if (isChatSelected) {
    return (
      <View className="flex-1">
        <View className="flex-1">
          <Text className="text-white">
            {JSON.stringify(messagesData, null, 2)}
          </Text>
        </View>
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
                onChangeText={(value) => setContent(value)}
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
