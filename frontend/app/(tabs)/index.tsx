import { RefreshControl, ScrollView, Text, View, Pressable } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { apiGet } from "@/src/api/client";
import { useAuth } from "@/src/auth/auth-context";
import { Badge, Card, ErrorState, Loading } from "@/src/components/ui";
import { Icon, IconName } from "@/src/components/icon";
import { ScreenHeader } from "@/src/components/header";
import { formatINR, formatINRCompact, shortDate } from "@/src/lib/format";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

export default function Dashboard() {
  const s = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => apiGet("/dashboard"),
  });

  const metrics: { label: string; value: string; icon: IconName; tint: string; onBg: string }[] = data
    ? [
        { label: "Total Sales", value: formatINRCompact(data.total_sales), icon: "trending-up", tint: colors.brandPrimary, onBg: colors.onBrandPrimary },
        { label: "Net Profit", value: formatINRCompact(data.net_profit), icon: "chart-line", tint: data.net_profit >= 0 ? colors.success : colors.error, onBg: "#FFFFFF" },
        { label: "Receivable", value: formatINRCompact(data.receivable), icon: "cash-plus", tint: colors.info, onBg: colors.onInfo },
        { label: "Payable", value: formatINRCompact(data.payable), icon: "cash-minus", tint: colors.warning, onBg: colors.onWarning },
      ]
    : [];

  const actions: { label: string; icon: IconName; route: string }[] = [
    { label: "New Sale", icon: "cart-plus", route: "/sales/new" },
    { label: "New Purchase", icon: "truck-plus", route: "/purchases/new" },
    { label: "Add Expense", icon: "wallet", route: "/expenses" },
    { label: "Inventory", icon: "package-variant-closed", route: "/inventory" },
    { label: "Dealers", icon: "storefront", route: "/dealers" },
    { label: "Reports", icon: "chart-box", route: "/reports" },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
      <ScreenHeader
        title="Soneja Electronics"
        subtitle={`Hi ${user?.name?.split(" ")[0] || "there"}, here's your business`}
        rightIcon="account-circle"
        onRightPress={() => router.push("/more")}
        rightTestID="dashboard-profile"
      />

      {isLoading ? (
        <Loading testID="dashboard-loading" />
      ) : isError ? (
        <ErrorState onRetry={refetch} testID="dashboard-error" />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl, gap: spacing.lg }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brandPrimary} />}
          testID="dashboard-scroll"
        >
          {/* Metric grid */}
          <View style={s.grid}>
            {metrics.map((m) => (
              <Card key={m.label} style={s.metricCard} testID={`metric-${m.label}`}>
                <View style={[s.metricIcon, { backgroundColor: m.tint }]}>
                  <Icon name={m.icon} size={18} color={m.onBg} />
                </View>
                <Text style={s.metricValue} numberOfLines={1}>
                  {m.value}
                </Text>
                <Text style={s.metricLabel}>{m.label}</Text>
              </Card>
            ))}
          </View>

          {/* Inventory strip */}
          <Card testID="inventory-summary">
            <View style={s.invRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.invLabel}>Inventory Value</Text>
                <Text style={s.invValue}>{formatINR(data.inventory_value)}</Text>
              </View>
              <View style={s.invDivider} />
              <View style={{ flex: 1, alignItems: "flex-end" }}>
                <Text style={s.invLabel}>Units in Stock</Text>
                <Text style={s.invValue}>{data.units_in_stock}</Text>
              </View>
            </View>
          </Card>

          {/* Quick actions */}
          <View>
            <Text style={s.sectionTitle}>Quick Actions</Text>
            <View style={s.actionGrid}>
              {actions.map((a) => (
                <Pressable
                  key={a.label}
                  onPress={() => router.push(a.route as any)}
                  style={({ pressed }) => [s.actionCard, pressed && { opacity: 0.7 }]}
                  testID={`action-${a.label}`}
                >
                  <View style={s.actionIcon}>
                    <Icon name={a.icon} size={22} color={colors.brandPrimary} />
                  </View>
                  <Text style={s.actionLabel}>{a.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Low stock */}
          <View>
            <Text style={s.sectionTitle}>Low Stock Alerts</Text>
            {data.low_stock?.length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md, paddingRight: spacing.lg }}>
                {data.low_stock.map((p: any) => (
                  <Card key={p.id} style={s.lowCard} testID={`low-stock-${p.id}`}>
                    <Icon name="alert" size={20} color={p.qty_on_hand <= 0 ? colors.error : colors.warning} />
                    <Text style={s.lowModel} numberOfLines={2}>
                      {p.model}
                    </Text>
                    <Badge label={`${p.qty_on_hand} left`} tone={p.qty_on_hand <= 0 ? "error" : "warning"} />
                  </Card>
                ))}
              </ScrollView>
            ) : (
              <Card>
                <Text style={s.emptyLine}>All products are well stocked.</Text>
              </Card>
            )}
          </View>

          {/* Recent sales */}
          <View>
            <View style={s.sectionRow}>
              <Text style={s.sectionTitle}>Recent Sales</Text>
              <Pressable onPress={() => router.push("/sales")} testID="see-all-sales">
                <Text style={s.link}>See all</Text>
              </Pressable>
            </View>
            {data.recent_sales?.length ? (
              <Card style={{ padding: 0 }}>
                {data.recent_sales.map((o: any, i: number) => (
                  <Pressable
                    key={o.id}
                    onPress={() => router.push(`/sales/${o.id}`)}
                    style={[s.recentRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.divider }]}
                    testID={`recent-sale-${o.id}`}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={s.recentName} numberOfLines={1}>
                        {o.party_name}
                      </Text>
                      <Text style={s.recentMeta}>
                        {o.ref_no || "No ref"} · {shortDate(o.date)}
                      </Text>
                    </View>
                    <View style={{ alignItems: "flex-end", gap: 4 }}>
                      <Text style={s.recentAmt}>{formatINR(o.total)}</Text>
                      <Badge
                        label={o.pay_status}
                        tone={o.pay_status === "cleared" ? "success" : o.pay_status === "partial" ? "warning" : "error"}
                      />
                    </View>
                  </Pressable>
                ))}
              </Card>
            ) : (
              <Card>
                <Text style={s.emptyLine}>No sales recorded yet.</Text>
              </Card>
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  metricCard: { width: "47.5%", flexGrow: 1, gap: 8 },
  metricIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  metricValue: { color: colors.onSurface, fontSize: 22, fontWeight: "800", fontVariant: ["tabular-nums"] },
  metricLabel: { color: colors.muted, fontSize: 13, fontWeight: "600" },
  invRow: { flexDirection: "row", alignItems: "center" },
  invDivider: { width: 1, height: 34, backgroundColor: colors.divider, marginHorizontal: spacing.md },
  invLabel: { color: colors.muted, fontSize: 12, fontWeight: "600" },
  invValue: { color: colors.onSurface, fontSize: 18, fontWeight: "800", marginTop: 2, fontVariant: ["tabular-nums"] },
  sectionTitle: { color: colors.onSurface, fontSize: 17, fontWeight: "800", marginBottom: spacing.md },
  sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  link: { color: colors.brandPrimary, fontSize: 14, fontWeight: "700", marginBottom: spacing.md },
  actionGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  actionCard: {
    width: "30%",
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.lg,
    alignItems: "center",
    gap: 8,
  },
  actionIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
  actionLabel: { color: colors.onSurfaceSecondary, fontSize: 12, fontWeight: "600", textAlign: "center" },
  lowCard: { width: 150, gap: 8 },
  lowModel: { color: colors.onSurface, fontSize: 14, fontWeight: "700", minHeight: 38 },
  emptyLine: { color: colors.muted, fontSize: 14 },
  recentRow: { flexDirection: "row", alignItems: "center", padding: spacing.lg },
  recentName: { color: colors.onSurface, fontSize: 15, fontWeight: "700" },
  recentMeta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  recentAmt: { color: colors.onSurface, fontSize: 15, fontWeight: "800", fontVariant: ["tabular-nums"] },
}));
