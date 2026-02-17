import { View, Text, Platform, Pressable } from "react-native";
import {
  FormControl,
  FormControlLabel,
  FormControlErrorText,
  FormControlLabelText,
  FormControlError,
} from "@/components/ui/form-control";
import { Input, InputField } from "@/components/ui/input";
import { Button, ButtonText } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { KeyboardAvoidingView } from "react-native";
import { HStack } from "@/components/ui/hstack";
import { Box } from "@/components/ui/box";
import { Link } from "expo-router";
import { useSignIn } from "@clerk/clerk-expo";
import { useState } from "react";
import { useRouter } from "expo-router";

export default function SignInForm() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const [clerkError, setClerkError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const router = useRouter();
  const formSchema = z.object({
    usernameOrEmail: z.string().nonempty("No username or email provided"),
    password: z
      .string()
      .max(128, "Password must not excedd 128 characters")
      .nonempty("No Password Entered"),
  });

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      usernameOrEmail: "",
      password: "",
    },
  });

  async function onSubmit(data: z.infer<typeof formSchema>) {
    if (!isLoaded) return;
    setIsLoading(true);
    setClerkError(null);

    try {
      const results = await signIn.create({
        identifier: data.usernameOrEmail,
        password: data.password,
      });

      if (results.status === "complete") {
        await setActive({ session: results.createdSessionId });
        router.push("/(protected)/(home)/(tabs)/chats");
      }
    } catch (err: any) {
      console.log(err);
      setClerkError(err.errors?.[0]?.message ?? "Sign In Failed");
    } finally {
      setIsLoading(false);
      form.resetField("password");
      form.resetField("usernameOrEmail");
    }
  }
  return (
    <View className="flex-1 flex items-center justify-center">
      <Card className="space-y-6 w-2/3 max-w-3xl">
        <Heading size="3xl">Sign In</Heading>
        <KeyboardAvoidingView
          behavior={Platform.OS == "android" ? "height" : "padding"}
        >
          <Controller
            name="usernameOrEmail"
            control={form.control}
            render={({ field, fieldState }) => (
              <FormControl isInvalid={!!fieldState.error}>
                <FormControlLabel>
                  <FormControlLabelText>Email or Username</FormControlLabelText>
                </FormControlLabel>
                <Input>
                  <InputField
                    keyboardType="email-address"
                    value={field.value}
                    onChangeText={field.onChange}
                  />
                </Input>
                {fieldState.error && (
                  <FormControlError>
                    <FormControlErrorText>
                      {fieldState.error.message}
                    </FormControlErrorText>
                  </FormControlError>
                )}
              </FormControl>
            )}
          />
          <Controller
            name="password"
            control={form.control}
            render={({ field, fieldState }) => (
              <FormControl isInvalid={!!fieldState.error}>
                <FormControlLabel>
                  <FormControlLabelText>Password</FormControlLabelText>
                </FormControlLabel>
                <Input>
                  <InputField
                    secureTextEntry
                    value={field.value}
                    onChangeText={field.onChange}
                  />
                </Input>
                {fieldState.error && (
                  <FormControlError>
                    <FormControlErrorText>
                      {fieldState.error.message}
                    </FormControlErrorText>
                  </FormControlError>
                )}
              </FormControl>
            )}
          />
        </KeyboardAvoidingView>
        <Button onPress={form.handleSubmit(onSubmit)}>
          <ButtonText size="lg">Sign in</ButtonText>
        </Button>
        <View className="w-full border border-primary flex items-center justify-center relative">
          <Text className="bg-background px-2 text-foreground absolute mx-auto text-lg">
            OR
          </Text>
        </View>
        <View className="flex gap-4 w-full flex-row">
          <Pressable className="flex-1 border-primary border">
            <Box className="flex items-center">
              <Heading size="md">Google</Heading>
            </Box>
          </Pressable>
          <Pressable className="flex-1 border border-primary">
            <Box className="flex items-center">
              <Heading size="md">Microsoft</Heading>
            </Box>
          </Pressable>
        </View>
        <View>
          <Text className="text-foreground">
            Don't have an account {`    `}
            <Link href={"/(protected)/(auth)/sign-up"}>
              <Heading size="sm" className="underline">
                Sign Up
              </Heading>
            </Link>
          </Text>
        </View>
      </Card>
    </View>
  );
}
