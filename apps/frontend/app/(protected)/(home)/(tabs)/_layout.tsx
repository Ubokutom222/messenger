import { View, Text } from "react-native";
import React from "react";
import { Tabs } from "expo-router";
import { useActiveChat } from "@/providers/ActiveChatProvider";
import { Heading } from "@/components/ui/heading";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@clerk/clerk-expo";

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs screenOptions={{}} initialRouteName="chats">
      <Tabs.Screen
        name="chats"
        options={{
          header: () => (
            <View
              className="w-full flex flex-row items-center py-4 bg-gray-700/50"
              style={{ marginTop: insets.top }}
            >
              <Heading size="xl">Chats</Heading>
            </View>
          ),
          title: "Chats",
        }}
      />
      <Tabs.Screen name="calls" options={{ title: "Calls" }} />
    </Tabs>
  );
}
