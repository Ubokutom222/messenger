import { View, Text, KeyboardAvoidingView, Platform } from "react-native";
import React from "react";
import { useTRPC } from "../../../trpc";
import { useQuery } from "@tanstack/react-query";
import { Spinner } from "@/components/ui/spinner";

export default function Chats() {
  const trpc = useTRPC();

  const { data, isFetching } = useQuery(trpc.getOtherUsers.queryOptions());
  if (isFetching) {
    return (
      <View>
        <Spinner />
      </View>
    );
  }
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS == "android" ? "height" : "padding"}
      className="flex-1"
    >
      <Text>{JSON.stringify(data, null, 2)}</Text>
    </KeyboardAvoidingView>
  );
}
