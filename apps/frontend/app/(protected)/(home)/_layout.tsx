import { Stack } from "expo-router";
import React from "react";

export default function HomeLayout() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="new-chat"
        options={{ presentation: "modal", headerShown: false }}
      />
    </Stack>
  );
}
