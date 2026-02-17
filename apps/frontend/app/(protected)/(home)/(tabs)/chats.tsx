import { View, Text } from "react-native";
import React from "react";
import { Button } from "@/components/ui/button";
import FontAwesome from "@expo/vector-icons/FontAwesome";

export default function Chats() {
  return (
    <View className="relative flex-1">
      <Button className="absolute right-8">
        <FontAwesome name="plus" />
      </Button>
    </View>
  );
}
