import { Stack } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import React from "react";

export default function Protect() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
    return null;
  }
  return (
    <Stack>
      <Stack.Protected guard={isSignedIn}>
        <Stack.Screen name="(home)" options={{}} />
      </Stack.Protected>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
    </Stack>
  );
}
