import { View, Text, KeyboardAvoidingView, Platform } from "react-native";
import React from "react";
import { Button, ButtonText } from "@/components/ui/button";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useRouter } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { useActiveChat } from "@/providers/ActiveChatProvider";
import { Input, InputField } from "@/components/ui/input";

export default function Chats() {
  const router = useRouter();
  const { signOut } = useAuth();
  const { activeChat } = useActiveChat();
  const isChatSelected = React.useMemo(() => {
    return !!activeChat;
  }, [activeChat]);
  if (isChatSelected) {
    return (
      <View className="flex-1">
        <View className="flex-1" />
        <KeyboardAvoidingView
          behavior={Platform.OS == "android" ? "height" : "padding"}
        >
          <View className="w-full flex flex-row py-2 gap-2">
            <Button>
              <ButtonText>Media</ButtonText>
            </Button>
            <Input className="flex-1">
              <InputField />
            </Input>
            <Button>
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
      <Button onPress={signOut}>
        <ButtonText>Sign Out</ButtonText>
      </Button>
    </View>
  );
}
