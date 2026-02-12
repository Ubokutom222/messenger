import { View, Text } from "react-native";
import React from "react";
import { Button, ButtonText } from "@/components/ui/button";
import { useSignUp, useAuth } from "@clerk/clerk-expo";

export default function index() {
  const { signOut } = useAuth();
  return (
    <View>
      <Button onPress={signOut}>
        <ButtonText>Sign Out</ButtonText>
      </Button>
    </View>
  );
}
