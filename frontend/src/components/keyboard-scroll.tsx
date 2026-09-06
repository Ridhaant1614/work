import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ScrollViewProps,
  ViewStyle,
} from "react-native";

// Drop-in replacement for react-native-keyboard-controller's KeyboardAwareScrollView,
// built only on React Native core so it works identically in Expo Go, web, and
// standalone iOS/Android builds (no extra native module on the app's startup path).
export function KeyboardAwareScrollView({
  children,
  contentContainerStyle,
  keyboardShouldPersistTaps = "handled",
  style,
  bottomOffset, // accepted for API compatibility; not needed with KeyboardAvoidingView
  ...rest
}: {
  children: React.ReactNode;
  bottomOffset?: number;
  style?: ViewStyle;
} & ScrollViewProps) {
  return (
    <KeyboardAvoidingView
      style={[{ flex: 1 }, style]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={contentContainerStyle}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
        {...rest}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
