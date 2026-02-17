import { View, Text, Platform, Pressable } from "react-native";
import {
  FormControl,
  FormControlLabel,
  FormControlErrorText,
  FormControlLabelText,
  FormControlError,
} from "@/components/ui/form-control";
import { Input, InputField } from "@/components/ui/input";
import { Button, ButtonSpinner, ButtonText } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { KeyboardAvoidingView } from "react-native";
import { Box } from "@/components/ui/box";
import { useState } from "react";
import { Link, useRouter } from "expo-router";
import { useSignUp } from "@clerk/clerk-expo";

export default function SignUpForm() {
  const [step, setStep] = useState<"OTP" | "SIGNUP">("SIGNUP");
  const [loading, setLoading] = useState<boolean>(false);
  const [clerkError, setClerkError] = useState<string | null>(null);
  const { signUp, setActive, isLoaded } = useSignUp();
  const formSchema = z.object({
    email: z.email(),
    username: z
      .string()
      .min(3, "Username must not be less that 3 characters")
      .nonempty("No username enterd"),
    password: z
      .string()
      .max(128, "Password must not excedd 128 characters")
      .nonempty("No Password Entered"),
    firstname: z.string().nonempty("Please enter your first name"),
    lastname: z.string().nonempty("Please enter your last name"),
  });
  const otpFormSchema = z.object({
    code: z
      .string()
      .length(6, "Please check the OTP again")
      .regex(/^\d+$/, "OTP must contain only numbers"),
  });

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      username: "",
      password: "",
      firstname: "",
      lastname: "",
    },
  });

  const otpForm = useForm({
    resolver: zodResolver(otpFormSchema),
    defaultValues: {
      code: "",
    },
  });

  async function onSubmit(data: z.infer<typeof formSchema>) {
    setLoading(true);
    setClerkError(null);
    if (!isLoaded) return;

    try {
      const results = await signUp.create({
        emailAddress: data.email,
        password: data.password,
        firstName: data.firstname,
        lastName: data.lastname,
        username: data.username,
      });

      await signUp.prepareEmailAddressVerification({
        strategy: "email_code",
      });
      setStep("OTP");
    } catch (err: any) {
      console.log(err);
      setClerkError(err.errors?.[0]?.message ?? "Sign up failed");
    } finally {
      setLoading(false);
    }
  }
  const router = useRouter();

  async function handVerify(data: z.infer<typeof otpFormSchema>) {
    setLoading(true);
    setClerkError(null);
    if (!isLoaded) return;

    try {
      const result = await signUp.attemptEmailAddressVerification({
        code: data.code,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.push("/(protected)/(home)/(tabs)/chats");
      }
    } catch (err: any) {
      setClerkError(err.errors?.[0]?.message ?? "Invalid Code");
    } finally {
      setLoading(false);
      setStep("SIGNUP");
      form.resetField("password");
      form.resetField("email");
      form.resetField("firstname");
      form.resetField("lastname");
      form.resetField("username");
      otpForm.resetField("code");
    }
  }
  return (
    <View className="flex-1 flex items-center justify-center">
      <Card className="space-y-6 w-2/3 max-w-3xl">
        <Heading size="3xl">Sign In</Heading>
        {step === "SIGNUP" && (
          <>
            <KeyboardAvoidingView
              behavior={Platform.OS == "android" ? "height" : "padding"}
            >
              <Controller
                name="email"
                control={form.control}
                render={({ field, fieldState }) => (
                  <FormControl isInvalid={!!fieldState.error}>
                    <FormControlLabel>
                      <FormControlLabelText>Email</FormControlLabelText>
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
                name="username"
                control={form.control}
                render={({ field, fieldState }) => (
                  <FormControl isInvalid={!!fieldState.error}>
                    <FormControlLabel>
                      <FormControlLabelText>Username</FormControlLabelText>
                    </FormControlLabel>
                    <Input>
                      <InputField
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
                name="firstname"
                control={form.control}
                render={({ field, fieldState }) => (
                  <FormControl isInvalid={!!fieldState.error}>
                    <FormControlLabel>
                      <FormControlLabelText>First Name</FormControlLabelText>
                    </FormControlLabel>
                    <Input>
                      <InputField
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
                name="lastname"
                control={form.control}
                render={({ field, fieldState }) => (
                  <FormControl isInvalid={!!fieldState.error}>
                    <FormControlLabel>
                      <FormControlLabelText>Last Name</FormControlLabelText>
                    </FormControlLabel>
                    <Input>
                      <InputField
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
            <Button onPress={form.handleSubmit(onSubmit)} isDisabled={loading}>
              {!loading ? (
                <ButtonText size="lg">Sign Up</ButtonText>
              ) : (
                <ButtonSpinner />
              )}
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
          </>
        )}
        {step === "OTP" && (
          <>
            <Controller
              name="code"
              control={otpForm.control}
              render={({ field, fieldState }) => (
                <FormControl isInvalid={!!fieldState.error}>
                  <FormControlLabel>
                    <FormControlLabelText>
                      Please enter the OTP sent to your email
                    </FormControlLabelText>
                  </FormControlLabel>
                  <Input>
                    <InputField
                      value={field.value}
                      onChangeText={field.onChange}
                      keyboardType="number-pad"
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
            <Button
              isDisabled={loading}
              onPress={otpForm.handleSubmit(handVerify)}
            >
              {!loading ? (
                <ButtonText size="lg">Verify</ButtonText>
              ) : (
                <ButtonSpinner />
              )}
            </Button>
          </>
        )}
        <View>
          <Text className="text-foreground">
            Already have an account {`    `}
            <Link href={"/(protected)/(auth)"}>
              <Heading size="sm" className="underline">
                Sign In
              </Heading>
            </Link>
          </Text>
        </View>
      </Card>
    </View>
  );
}
