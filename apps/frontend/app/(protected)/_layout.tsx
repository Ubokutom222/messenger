import { Stack, useRouter, useSegments, usePathname } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { useEffect } from "react";

export default function Protect() {
  const { isSignedIn, isLoaded } = useAuth();
  // const segments: string[] = useSegments();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoaded) return;

    const inAuthGroup = pathname.includes("(auth)");

    if (isSignedIn && inAuthGroup) {
      router.replace("/(protected)/(home)/(tabs)/chats");
    } else if (!isSignedIn && !inAuthGroup) {
      router.replace("/(protected)/(auth)");
    }
  }, [isSignedIn, isLoaded, pathname]);

  if (!isLoaded) {
    return null;
  }
  console.log(isSignedIn);
  return (
    <Stack initialRouteName="(home)">
      <Stack.Protected guard={isSignedIn}>
        <Stack.Screen name="(home)" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Screen name="(auth)/index" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)/sign-up" options={{ headerShown: false }} />
    </Stack>
  );
}
