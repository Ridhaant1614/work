import React from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { Icon, IconName } from "@/src/components/icon";

// ---------------------------------------------------------------- Card
export function Card({
  children,
  style,
  testID,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  testID?: string;
}) {
  const s = useStyles();
  return (
    <View style={[s.card, style]} testID={testID}>
      {children}
    </View>
  );
}

// ---------------------------------------------------------------- Badge
type Tone = "success" | "warning" | "error" | "info" | "neutral" | "brand";
export function Badge({ label, tone = "neutral", testID }: { label: string; tone?: Tone; testID?: string }) {
  const { colors } = useTheme();
  const map: Record<Tone, { bg: string; fg: string }> = {
    success: { bg: colors.success, fg: colors.onSuccess },
    warning: { bg: colors.warning, fg: colors.onWarning },
    error: { bg: colors.error, fg: colors.onError },
    info: { bg: colors.info, fg: colors.onInfo },
    brand: { bg: colors.brandTertiary, fg: colors.onBrandTertiary },
    neutral: { bg: colors.surfaceTertiary, fg: colors.onSurfaceTertiary },
  };
  const c = map[tone];
  return (
    <View
      testID={testID}
      style={{
        backgroundColor: c.bg,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: radius.pill,
        alignSelf: "flex-start",
      }}
    >
      <Text style={{ color: c.fg, fontSize: 11, fontWeight: "700", letterSpacing: 0.3 }}>
        {label.toUpperCase()}
      </Text>
    </View>
  );
}

export function payTone(status: string): Tone {
  if (status === "cleared") return "success";
  if (status === "partial") return "warning";
  return "error";
}

// ---------------------------------------------------------------- Button
export function Button({
  title,
  onPress,
  variant = "primary",
  loading,
  disabled,
  icon,
  testID,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "outline" | "danger";
  loading?: boolean;
  disabled?: boolean;
  icon?: IconName;
  testID?: string;
  style?: ViewStyle;
}) {
  const { colors } = useTheme();
  const bg =
    variant === "primary"
      ? colors.brandPrimary
      : variant === "danger"
      ? colors.error
      : variant === "secondary"
      ? colors.brandTertiary
      : "transparent";
  const fg =
    variant === "primary"
      ? colors.onBrandPrimary
      : variant === "danger"
      ? colors.onError
      : variant === "secondary"
      ? colors.onBrandTertiary
      : colors.brandPrimary;
  const isDisabled = disabled || loading;
  return (
    <Pressable
      testID={testID}
      disabled={isDisabled}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress();
      }}
      style={({ pressed }) => [
        {
          backgroundColor: bg,
          borderWidth: variant === "outline" ? 1.5 : 0,
          borderColor: colors.brandPrimary,
          borderRadius: radius.md,
          paddingVertical: 14,
          paddingHorizontal: 18,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon ? <Icon name={icon} size={18} color={fg} /> : null}
          <Text style={{ color: fg, fontSize: 15, fontWeight: "700" }}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

// ---------------------------------------------------------------- Field
export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  secureTextEntry,
  autoCapitalize,
  multiline,
  testID,
  ...rest
}: {
  label?: string;
  value: string;
  onChangeText: (t: string) => void;
  testID?: string;
} & TextInputProps) {
  const s = useStyles();
  const { colors } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      {label ? <Text style={s.fieldLabel}>{label}</Text> : null}
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        multiline={multiline}
        style={[s.input, multiline && { height: 88, textAlignVertical: "top" }]}
        {...rest}
      />
    </View>
  );
}

// ---------------------------------------------------------------- States
export function Loading({ testID }: { testID?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl }} testID={testID}>
      <ActivityIndicator size="large" color={colors.brandPrimary} />
    </View>
  );
}

export function EmptyState({
  image,
  title,
  subtitle,
  actionLabel,
  onAction,
  testID,
}: {
  image?: string;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  testID?: string;
}) {
  const s = useStyles();
  return (
    <View style={s.emptyWrap} testID={testID}>
      {image ? <Image source={{ uri: image }} style={s.emptyImg} contentFit="cover" /> : null}
      <Text style={s.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={s.emptySub}>{subtitle}</Text> : null}
      {actionLabel && onAction ? (
        <View style={{ marginTop: spacing.md, alignSelf: "stretch", paddingHorizontal: spacing.xl }}>
          <Button title={actionLabel} onPress={onAction} icon="plus" testID="empty-action" />
        </View>
      ) : null}
    </View>
  );
}

export function ErrorState({ onRetry, testID }: { onRetry: () => void; testID?: string }) {
  const s = useStyles();
  return (
    <View style={s.emptyWrap} testID={testID}>
      <Icon name="wifi-off" size={40} />
      <Text style={s.emptyTitle}>Something went wrong</Text>
      <Text style={s.emptySub}>We couldn&apos;t load this data.</Text>
      <View style={{ marginTop: spacing.md }}>
        <Button title="Retry" onPress={onRetry} variant="outline" icon="refresh" testID="retry-button" />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------- Avatar
export function InitialsAvatar({ name, size = 44 }: { name: string; size?: number }) {
  const { colors } = useTheme();
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.brandTertiary,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color: colors.onBrandTertiary, fontWeight: "700", fontSize: size * 0.36 }}>
        {initials || "?"}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------- Row separator
export function Divider() {
  const { colors } = useTheme();
  return <View style={{ height: 1, backgroundColor: colors.divider }} />;
}

const useStyles = makeStyles((colors) => ({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  fieldLabel: { color: colors.onSurfaceSecondary, fontSize: 13, fontWeight: "600" },
  input: {
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: colors.onSurface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyWrap: { alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: 6, paddingTop: 60 },
  emptyImg: { width: 130, height: 130, borderRadius: radius.lg, marginBottom: spacing.md },
  emptyTitle: { color: colors.onSurface, fontSize: 17, fontWeight: "700" },
  emptySub: { color: colors.muted, fontSize: 14, textAlign: "center" },
}));
