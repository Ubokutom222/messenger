import {
  View,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
} from "react-native";
import React from "react";
import { useTRPC } from "../../../trpc";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Spinner } from "@/components/ui/spinner";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { useActiveChat } from "@/providers/ActiveChatProvider";
import { useRouter } from "expo-router";
import type { Users, User } from "@messenger/types";
import { Input, InputField } from "@/components/ui/input";
import { ButtonText, Button } from "@/components/ui/button";
import {
  Avatar,
  AvatarFallback,
  AvatarFallbackText,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  Checkbox,
  CheckboxIndicator,
  CheckboxLabel,
  CheckboxIcon,
} from "@/components/ui/checkbox";
import { CheckIcon } from "@/components/ui/icon";
import { Badge, BadgeText } from "@/components/ui/badge";
import { HStack } from "@/components/ui/hstack";
import {
  Toast,
  ToastTitle,
  ToastDescription,
  useToast,
} from "@/components/ui/toast";

export default function Chats() {
  const trpc = useTRPC();
  const insets = useSafeAreaInsets();
  const { setActiveChat } = useActiveChat();
  const router = useRouter();

  const [mode, setMode] = React.useState<"CONV" | "GROUP">("CONV");

  const { data, isFetching } = useQuery(
    trpc.getOtherUsers.queryOptions({
      mode,
    }),
  );

  // const isFetching = false
  // const data = [{ "DOB": null, "createdAt": "2026-02-13T20:31:25.412Z", "email": "ubokutomudoakpaetok@gmail.com", "emailVerified": "2026-02-13T20:31:25.412Z", "id": "user_39d8eTUdiQd6W6uSYBRgbKXTdk9", "image": null, "name": "Ubokutom Udo-akpaetok", "phoneNumber": null, "updatedAt": "2026-02-13T20:31:25.412Z", "username": "ubokutom222" }, { "DOB": "iohfojioj aodfo", "createdAt": "2026-02-13T20:31:25.412Z", "email": "ubokutomudoakpaetok@gmail.com", "emailVerified": "2026-02-13T20:31:25.412Z", "id": "user_39d8eTUdiQd6W6uSYBRgbKXTdk9", "image": null, "name": "Ubokutom Udo-akpaetok", "phoneNumber": null, "updatedAt": "2026-02-13T20:31:25.412Z", "username": "ubokutom222" }, { "DOB": "iohfojioj aodfo", "createdAt": "2026-02-13T20:31:25.412Z", "email": "ubokutomudoakpaetok@gmail.com", "emailVerified": "2026-02-13T20:31:25.412Z", "id": "user_39d8eTUdiQd6W6uSYBRgbKXTdk9", "image": null, "name": "Ubokutom Udo-akpaetok", "phoneNumber": null, "updatedAt": "2026-02-13T20:31:25.412Z", "username": "ubokutom222" }, { "DOB": "iohfojioj aodfo", "createdAt": "2026-02-13T20:31:25.412Z", "email": "ubokutomudoakpaetok@gmail.com", "emailVerified": "2026-02-13T20:31:25.412Z", "id": "user_39d8eTUdiQd6W6uSYBRgbKXTdk9", "image": null, "name": "Ubokutom Udo-akpaetok", "phoneNumber": null, "updatedAt": "2026-02-13T20:31:25.412Z", "username": "ubokutom222" }, { "DOB": "iohfojioj aodfo", "createdAt": "2026-02-13T20:31:25.412Z", "email": "ubokutomudoakpaetok@gmail.com", "emailVerified": "2026-02-13T20:31:25.412Z", "id": "user_39d8eTUdiQd6W6uSYBRgbKXTdk9", "image": null, "name": "Ubokutom Udo-akpaetok", "phoneNumber": null, "updatedAt": "2026-02-13T20:31:25.412Z", "username": "ubokutom222" }, { "DOB": "iohfojioj aodfo", "createdAt": "2026-02-13T20:31:25.412Z", "email": "ubokutomudoakpaetok@gmail.com", "emailVerified": "2026-02-13T20:31:25.412Z", "id": "user_39d8eTUdiQd6W6uSYBRgbKXTdk9", "image": null, "name": "Ubokutom Udo-akpaetok", "phoneNumber": null, "updatedAt": "2026-02-13T20:31:25.412Z", "username": "ubokutom222" }, { "DOB": "iohfojioj aodfo", "createdAt": "2026-02-13T20:31:25.412Z", "email": "ubokutomudoakpaetok@gmail.com", "emailVerified": "2026-02-13T20:31:25.412Z", "id": "user_39d8eTUdiQd6W6uSYBRgbKXTdk9", "image": null, "name": "Ubokutom Udo-akpaetok", "phoneNumber": "ahsdfoahs aoihsdfha", "updatedAt": "2026-02-13T20:31:25.412Z", "username": "ubokutom222" }, { "DOB": "null", "createdAt": "2026-02-13T20:31:25.412Z", "email": "ubokutomudoakpaetok@gmail.com", "emailVerified": "2026-02-13T20:31:25.412Z", "id": "user_39d8eTUdiQd6W6uSYBRgbKXTdk9", "image": null, "name": "Ubokutom Udo-akpaetok", "phoneNumber": "ahsdfoahs aoihsdfha", "updatedAt": "2026-02-13T20:31:25.412Z", "username": "ubokutom222" }, { "DOB": "null", "createdAt": "2026-02-13T20:31:25.412Z", "email": "ubokutomudoakpaetok@gmail.com", "emailVerified": "2026-02-13T20:31:25.412Z", "id": "user_39d8eTUdiQd6W6uSYBRgbKXTdk9", "image": null, "name": "Ubokutom Udo-akpaetok", "phoneNumber": "ahsdfoahs aoihsdfha", "updatedAt": "2026-02-13T20:31:25.412Z", "username": "ubokutom222" }, { "DOB": "null", "createdAt": "2026-02-13T20:31:25.412Z", "email": "ubokutomudoakpaetok@gmail.com", "emailVerified": "2026-02-13T20:31:25.412Z", "id": "user_39d8eTUdiQd6W6uSYBRgbKXTdk9", "image": null, "name": "Ubokutom Udo-akpaetok", "phoneNumber": "ahsdfoahs aoihsdfha", "updatedAt": "2026-02-13T20:31:25.412Z", "username": "ubokutom222" }, { "DOB": "null", "createdAt": "2026-02-13T20:31:25.412Z", "email": "ubokutomudoakpaetok@gmail.com", "emailVerified": "2026-02-13T20:31:25.412Z", "id": "user_39d8eTUdiQd6W6uSYBRgbKXTdk9", "image": null, "name": "Ubokutom Udo-akpaetok", "phoneNumber": null, "updatedAt": "2026-02-13T20:31:25.412Z", "username": "ubokutom222" }]

  const [selectedUser, setSelectedUser] = React.useState<Users>([]);

  function handleSelectUser(user: User) {
    setSelectedUser((prev) => {
      if (prev.some((u) => u.id === user.id)) {
        return prev.filter((u) => u.id !== user.id);
      }
      return [...prev, user];
    });
  }

  const [groupName, setGroupName] = React.useState<string>("");
  const [error, setError] = React.useState<string | null>(null);

  const createGroupMutation = useMutation(
    trpc.createGroup.mutationOptions({
      onError(error) {
        setError(error.message);
      },
    }),
  );
  const isSelected = (userId: string) =>
    selectedUser.some((u) => u.id === userId);

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
      render: ({ id }) => {
        const uniqueToastId = "toast-" + id;
        return (
          <Toast nativeID={uniqueToastId} action={type} variant="solid">
            <ToastTitle>{type.toUpperCase()}</ToastTitle>
            <ToastDescription>{message}</ToastDescription>
          </Toast>
        );
      },
    });
  }

  async function handleCreate() {
    if (selectedUser.length < 2) {
      handleToast("info", "Select more that one user");
      return;
    }
    if (groupName.length < 1) {
      handleToast("error", "You have not entered a group name");
      return;
    }
    try {
      const newConversation = await createGroupMutation.mutateAsync({
        name: groupName,
        conversationMembers: selectedUser,
      });
      setActiveChat(newConversation);
      router.push("/(protected)/(home)/(tabs)/chats");
    } catch (err) {
      console.log("Error from the server", err);
      console.log("Client Error", error);
    }
  }

  return (
    <View
      className={`flex-1 pt-[${insets.top}]`}
      style={{ paddingTop: insets.top }}
    >
      <View className="w-full flex justify-center items-center flex-row">
        <Pressable onPress={() => setMode("CONV")}>
          <Box
            className={`rounded-r-none rounded-l-full p-4 ${mode == "CONV" ? "bg-primary text-bold" : "bg-secondary"}`}
          >
            <Text>Start Conversation</Text>
          </Box>
        </Pressable>
        <Pressable onPress={() => setMode("GROUP")}>
          <Box
            className={`rounded-l-none rounded-r-full p-4 ${mode == "GROUP" ? "bg-primary" : "bg-secondary"}`}
          >
            <Text>Create Group</Text>
          </Box>
        </Pressable>
      </View>
      {isFetching ? (
        <View className="flex-1 flex items-center justify-center">
          <Spinner size="large" />
        </View>
      ) : mode === "CONV" ? (
        <View className="flex-1 mt-6">
          <ScrollView className="flex-1">
            <VStack className="flex-1 gap-2">
              {data?.map((item, index) => (
                <Pressable
                  key={index}
                  onPress={() => {
                    setActiveChat(item);
                    router.push("/(protected)/(home)/(tabs)/chats");
                  }}
                >
                  <Box className="rounded-full bg-gray-700/50 p-6 flex-row items-center justify-between">
                    <Avatar>
                      <AvatarImage src={item.image ?? undefined} />
                      <AvatarFallback>
                        <AvatarFallbackText>Image</AvatarFallbackText>
                      </AvatarFallback>
                    </Avatar>
                    <Text className="text-semibold text-white text-lg flex-1">
                      {item.name}
                    </Text>
                  </Box>
                </Pressable>
              ))}
            </VStack>
          </ScrollView>
        </View>
      ) : (
        <View className="flex-1 mt-6 relative">
          <Input className="my-2">
            <InputField
              placeholder="Enter Group Name"
              className="text-lg"
              value={groupName}
              onChangeText={(value) => setGroupName(value)}
            />
          </Input>
          {selectedUser.length > 0 && (
            <HStack className="w-full flex flex-row" space="md">
              {selectedUser.map((item) => (
                <Badge key={item.id} className="p-1.5">
                  <BadgeText className="text-sm">
                    {item.name.split(" ")[0]}
                  </BadgeText>
                </Badge>
              ))}
            </HStack>
          )}
          <ScrollView className="flex-1">
            <VStack className="flex-1 gap-2">
              {data?.map((item, index) => (
                <Pressable key={index} onPress={() => handleSelectUser(item)}>
                  <Box className="rounded-full bg-gray-700/50 p-6 flex-row items-center justify-between gap-2">
                    <Avatar>
                      <AvatarImage src={item.image ?? undefined} />
                      <AvatarFallback>
                        <AvatarFallbackText>Image</AvatarFallbackText>
                      </AvatarFallback>
                    </Avatar>
                    <Text className="text-semibold text-white text-lg flex-1">
                      {item.name}
                    </Text>
                    <Checkbox
                      isDisabled={false}
                      isInvalid={false}
                      value=""
                      isChecked={isSelected(item.id)}
                    >
                      <CheckboxIndicator>
                        <CheckboxIcon as={CheckIcon} />
                      </CheckboxIndicator>
                    </Checkbox>
                  </Box>
                </Pressable>
              ))}
            </VStack>
          </ScrollView>
          <KeyboardAvoidingView
            behavior={Platform.OS == "android" ? "height" : "padding"}
            className="absolute bottom-2 flex items-center w-full"
          >
            <Button onPress={() => handleCreate()} className="w-4/5 py-4">
              <ButtonText className="font-extrabold">Create Group</ButtonText>
            </Button>
          </KeyboardAvoidingView>
        </View>
      )}
    </View>
  );
}
