import { ScrollView, Text, View, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/src/auth/auth-context";
import { Card, InitialsAvatar } from "@/src/components/ui";
import { Icon, IconName } from "@/src/components/icon";
import { ScreenHeader } from "@/src/components/header";
import { useToast } from "@/src/components/toast";
import { makeStyles, spacing, useTheme } from "@/src/theme";

export default function More() {
  const s = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const { user, logout } = useAuth();
  const toast = useToast();
  const insets = useSafeAreaInsets();

  const items: { label: string; sub: string; icon: IconName; route: string; ownerOnly?: boolean }[] = [
    { label: "Inventory", sub: "Stock on hand by model", icon: "package-variant-closed", route: "/inventory" },
    { label: "Products & Cost Sheet", sub: "SKUs, models & costing", icon: "tag-multiple", route: "/products" },
    { label: "Dealer Network", sub: "Shop owners you work with", icon: "storefront", route: "/dealers" },
    { label: "Daily Expenses", sub: "Track spending", icon: "wallet", route: "/expenses" },
    { label: "Reports", sub: "Sales, profit & aging", icon: "chart-box", route: "/reports" },
    { label: "Staff", sub: "Manage team access", icon: "account-group", route: "/staff", ownerOnly: true },
  ];

  const visible = items.filter((i) => !i.ownerOnly || user?.role === "owner");

  async function doLogout() {
    await logout();
    toast.show("Signed out", "info");
    router.replace("/login");
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
      <ScreenHeader title="More" subtitle="Tools & settings" />
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        <Card style={s.profile} testID="more-profile">
          <InitialsAvatar name={user?.name || "User"} size={52} />
          <View style={{ flex: 1 }}>
            <Text style={s.name}>{user?.name}</Text>
            <Text style={s.email}>{user?.email}</Text>
          </View>
          <View style={s.roleBadge}>
            <Text style={s.roleText}>{user?.role?.toUpperCase()}</Text>
          </View>
        </Card>

        <Card style={{ padding: 0 }}>
          {visible.map((it, i) => (
            <Pressable
              key={it.label}
              onPress={() => router.push(it.route as any)}
              style={({ pressed }) => [s.row, i > 0 && s.rowBorder, pressed && { opacity: 0.6 }]}
              testID={`more-${it.label}`}
            >
              <View style={s.rowIcon}>
                <Icon name={it.icon} size={22} color={colors.brandPrimary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.rowLabel}>{it.label}</Text>
                <Text style={s.rowSub}>{it.sub}</Text>
              </View>
              <Icon name="chevron-right" size={22} color={colors.muted} />
            </Pressable>
          ))}
        </Card>

        <Pressable onPress={doLogout} style={s.logout} testID="logout-button">
          <Icon name="logout" size={20} color={colors.error} />
          <Text style={s.logoutText}>Sign Out</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  profile: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  name: { color: colors.onSurface, fontSize: 17, fontWeight: "800" },
  email: { color: colors.muted, fontSize: 13, marginTop: 2 },
  roleBadge: { backgroundColor: colors.brandTertiary, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  roleText: { color: colors.onBrandTertiary, fontSize: 11, fontWeight: "800" },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.divider },
  rowIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
  rowLabel: { color: colors.onSurface, fontSize: 15, fontWeight: "700" },
  rowSub: { color: colors.muted, fontSize: 12, marginTop: 2 },
  logout: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  logoutText: { color: colors.error, fontSize: 15, fontWeight: "700" },
}));
