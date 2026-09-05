import { useState } from "react";
import { Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { useAuth } from "@/src/auth/auth-context";
import { Button, Field } from "@/src/components/ui";
import { useToast } from "@/src/components/toast";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

export default function Login() {
  const { login } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const s = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("owner@soneja.com");
  const [password, setPassword] = useState("Soneja@123");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!email.trim() || !password) {
      toast.show("Enter email and password", "error");
      return;
    }
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      router.replace("/(tabs)");
    } catch (e: any) {
      toast.show(e?.message || "Login failed", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <LinearGradient
        colors={[colors.brand, colors.brandSecondary]}
        style={[s.hero, { paddingTop: insets.top + spacing.xl }]}
      >
        <View style={s.logoBox}>
          <Text style={s.logoText}>SE</Text>
        </View>
        <Text style={s.brandName}>Soneja Electronics</Text>
        <Text style={s.brandTag}>Distribution CRM & Trackers</Text>
      </LinearGradient>

      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.form}
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={s.title}>Welcome back</Text>
        <Text style={s.subtitle}>Sign in to manage your business</Text>

        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@business.com"
          keyboardType="email-address"
          autoCapitalize="none"
          testID="login-email"
        />
        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="Your password"
          secureTextEntry
          testID="login-password"
        />
        <View style={{ height: spacing.sm }} />
        <Button title="Sign In" onPress={submit} loading={loading} testID="login-submit" icon="login" />
        <Text style={s.hint}>Owner demo: owner@soneja.com / Soneja@123</Text>
      </KeyboardAwareScrollView>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  hero: {
    paddingBottom: spacing["2xl"],
    paddingHorizontal: spacing.xl,
    alignItems: "center",
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
  },
  logoBox: {
    width: 72,
    height: 72,
    borderRadius: radius.lg,
    backgroundColor: colors.onBrand,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  logoText: { color: colors.brand, fontSize: 30, fontWeight: "800", letterSpacing: 1 },
  brandName: { color: colors.onBrand, fontSize: 22, fontWeight: "800" },
  brandTag: { color: colors.onBrand, fontSize: 13, opacity: 0.85, marginTop: 2 },
  form: { padding: spacing.xl, gap: spacing.md },
  title: { color: colors.onSurface, fontSize: 24, fontWeight: "800" },
  subtitle: { color: colors.muted, fontSize: 14, marginBottom: spacing.sm },
  hint: { color: colors.muted, fontSize: 12, textAlign: "center", marginTop: spacing.md },
}));
