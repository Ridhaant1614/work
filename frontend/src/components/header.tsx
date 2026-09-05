import React from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { makeStyles, spacing, useTheme } from "@/src/theme";
import { Icon, IconName } from "@/src/components/icon";

export function ScreenHeader({
  title,
  subtitle,
  showBack,
  rightIcon,
  onRightPress,
  rightTestID,
}: {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  rightIcon?: IconName;
  onRightPress?: () => void;
  rightTestID?: string;
}) {
  const s = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[s.wrap, { paddingTop: insets.top + spacing.sm }]}>
      <View style={s.row}>
        {showBack ? (
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            style={s.iconBtn}
            testID="header-back"
          >
            <Icon name="chevron-left" size={26} color={colors.onSurface} />
          </Pressable>
        ) : null}
        <View style={{ flex: 1 }}>
          <Text style={s.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={s.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {rightIcon ? (
          <Pressable onPress={onRightPress} hitSlop={10} style={s.iconBtn} testID={rightTestID}>
            <Icon name={rightIcon} size={24} color={colors.brandPrimary} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  wrap: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceTertiary,
  },
  title: { color: colors.onSurface, fontSize: 22, fontWeight: "800" },
  subtitle: { color: colors.muted, fontSize: 13, marginTop: 1 },
}));
