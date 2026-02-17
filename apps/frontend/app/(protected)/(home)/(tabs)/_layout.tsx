import { View, Text } from "react-native";
import React from "react";
import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{}} initialRouteName="chats">
      <Tabs.Screen
        name="calls"
        options={{ title: "Chats", tabBarIconStyle: { color: "#945af2" } }}
      />
      <Tabs.Screen name="chats" options={{ title: "Calls" }} />
    </Tabs>
  );
}
