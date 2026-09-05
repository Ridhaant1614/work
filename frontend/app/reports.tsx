import { ScrollView, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { apiGet } from "@/src/api/client";
import { Card, ErrorState, Loading } from "@/src/components/ui";
import { Icon, IconName } from "@/src/components/icon";
import { ScreenHeader } from "@/src/components/header";
import { formatINR, formatINRCompact } from "@/src/lib/format";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

function monthLabel(key: string) {
  if (key === "unknown") return "—";
  const [y, m] = key.split("-");
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${names[parseInt(m, 10) - 1]} ${y.slice(2)}`;
}

export default function Reports() {
  const s = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["reports"],
    queryFn: () => apiGet("/reports"),
  });

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
        <ScreenHeader title="Reports" subtitle="Business summary" showBack />
        <Loading testID="reports-loading" />
      </View>
    );
  }
  if (isError || !data) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
        <ScreenHeader title="Reports" subtitle="Business summary" showBack />
        <ErrorState onRetry={refetch} testID="reports-error" />
      </View>
    );
  }

  const sum = data.summary;
  const stats: { label: string; value: string; icon: IconName; color: string }[] = [
    { label: "Gross Profit", value: formatINRCompact(sum.gross_profit), icon: "chart-line-variant", color: colors.success },
    { label: "Net Profit", value: formatINRCompact(sum.net_profit), icon: "cash-multiple", color: sum.net_profit >= 0 ? colors.success : colors.error },
    { label: "Cost of Goods", value: formatINRCompact(sum.cogs), icon: "cart", color: colors.info },
    { label: "Expenses", value: formatINRCompact(sum.total_expenses), icon: "wallet", color: colors.warning },
  ];

  // Combine months
  const months = Array.from(new Set([...Object.keys(data.sales_by_month), ...Object.keys(data.purchases_by_month)])).sort();
  const maxMonth = Math.max(1, ...months.map((m) => Math.max(data.sales_by_month[m] || 0, data.purchases_by_month[m] || 0)));

  const topMax = Math.max(1, ...data.top_products.map((p: any) => p.qty));
  const expEntries = Object.entries(data.expense_by_category) as [string, number][];
  const expMax = Math.max(1, ...expEntries.map(([, v]) => v));

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
      <ScreenHeader title="Reports" subtitle="Business summary" showBack />
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}
        showsVerticalScrollIndicator={false}
        testID="reports-scroll"
      >
        {/* Headline profit */}
        <Card style={s.headline} testID="report-net-profit">
          <Text style={s.headlineLabel}>Net Profit</Text>
          <Text style={[s.headlineValue, { color: sum.net_profit >= 0 ? colors.success : colors.error }]}>{formatINR(sum.net_profit)}</Text>
          <Text style={s.headlineSub}>
            Sales {formatINRCompact(sum.total_sales)} − COGS {formatINRCompact(sum.cogs)} − Expenses {formatINRCompact(sum.total_expenses)}
          </Text>
        </Card>

        {/* Stat grid */}
        <View style={s.grid}>
          {stats.map((st) => (
            <Card key={st.label} style={s.statCard}>
              <View style={[s.statIcon, { backgroundColor: st.color }]}>
                <Icon name={st.icon} size={16} color="#FFFFFF" />
              </View>
              <Text style={s.statValue}>{st.value}</Text>
              <Text style={s.statLabel}>{st.label}</Text>
            </Card>
          ))}
        </View>

        {/* Sales vs Purchases */}
        <Card>
          <Text style={s.sectionTitle}>Sales vs Purchases</Text>
          <View style={s.legendRow}>
            <View style={s.legendItem}>
              <View style={[s.dot, { backgroundColor: colors.brandPrimary }]} />
              <Text style={s.legendText}>Sales</Text>
            </View>
            <View style={s.legendItem}>
              <View style={[s.dot, { backgroundColor: colors.warning }]} />
              <Text style={s.legendText}>Purchases</Text>
            </View>
          </View>
          {months.length === 0 ? (
            <Text style={s.empty}>No data yet.</Text>
          ) : (
            months.map((m) => (
              <View key={m} style={s.monthBlock}>
                <Text style={s.monthLabel}>{monthLabel(m)}</Text>
                <View style={s.barTrack}>
                  <View style={[s.bar, { width: `${((data.sales_by_month[m] || 0) / maxMonth) * 100}%`, backgroundColor: colors.brandPrimary }]} />
                </View>
                <Text style={s.barValue}>{formatINRCompact(data.sales_by_month[m] || 0)}</Text>
                <View style={s.barTrack}>
                  <View style={[s.bar, { width: `${((data.purchases_by_month[m] || 0) / maxMonth) * 100}%`, backgroundColor: colors.warning }]} />
                </View>
                <Text style={s.barValue}>{formatINRCompact(data.purchases_by_month[m] || 0)}</Text>
              </View>
            ))
          )}
        </Card>

        {/* Top products */}
        <Card>
          <Text style={s.sectionTitle}>Top Selling Products</Text>
          {data.top_products.length === 0 ? (
            <Text style={s.empty}>No sales recorded yet.</Text>
          ) : (
            data.top_products.map((p: any) => (
              <View key={p.model} style={s.topRow}>
                <Text style={s.topModel} numberOfLines={1}>
                  {p.model}
                </Text>
                <View style={s.topBarTrack}>
                  <View style={[s.bar, { width: `${(p.qty / topMax) * 100}%`, backgroundColor: colors.brandSecondary }]} />
                </View>
                <Text style={s.topQty}>{p.qty}</Text>
              </View>
            ))
          )}
        </Card>

        {/* Expense breakdown */}
        {expEntries.length > 0 ? (
          <Card>
            <Text style={s.sectionTitle}>Expenses by Category</Text>
            {expEntries.map(([cat, val]) => (
              <View key={cat} style={s.topRow}>
                <Text style={s.topModel}>{cat}</Text>
                <View style={s.topBarTrack}>
                  <View style={[s.bar, { width: `${(val / expMax) * 100}%`, backgroundColor: colors.warning }]} />
                </View>
                <Text style={s.topQty}>{formatINRCompact(val)}</Text>
              </View>
            ))}
          </Card>
        ) : null}

        {/* Overdue receivables */}
        <Card>
          <Text style={s.sectionTitle}>Outstanding Receivables</Text>
          {data.overdue_receivables.length === 0 ? (
            <Text style={s.empty}>All dealer payments cleared 🎉</Text>
          ) : (
            data.overdue_receivables.map((r: any) => (
              <View key={r.id} style={s.dueRow} testID={`due-recv-${r.id}`}>
                <View style={{ flex: 1 }}>
                  <Text style={s.dueName} numberOfLines={1}>
                    {r.party_name}
                  </Text>
                  <Text style={s.dueMeta}>
                    {r.ref_no || "No ref"} · {r.age_days}d overdue
                  </Text>
                </View>
                <Text style={[s.dueAmt, { color: colors.error }]}>{formatINR(r.balance)}</Text>
              </View>
            ))
          )}
        </Card>

        {/* Overdue payables */}
        <Card>
          <Text style={s.sectionTitle}>Outstanding Payables</Text>
          {data.overdue_payables.length === 0 ? (
            <Text style={s.empty}>No pending supplier payments.</Text>
          ) : (
            data.overdue_payables.map((r: any) => (
              <View key={r.id} style={s.dueRow} testID={`due-pay-${r.id}`}>
                <View style={{ flex: 1 }}>
                  <Text style={s.dueName} numberOfLines={1}>
                    {r.party_name}
                  </Text>
                  <Text style={s.dueMeta}>
                    {r.ref_no || "No ref"} · {r.age_days}d
                  </Text>
                </View>
                <Text style={[s.dueAmt, { color: colors.warning }]}>{formatINR(r.balance)}</Text>
              </View>
            ))
          )}
        </Card>
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  headline: { alignItems: "center", gap: 4 },
  headlineLabel: { color: colors.muted, fontSize: 13, fontWeight: "600" },
  headlineValue: { fontSize: 32, fontWeight: "800", fontVariant: ["tabular-nums"] },
  headlineSub: { color: colors.muted, fontSize: 12, textAlign: "center", marginTop: 2 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  statCard: { width: "47.5%", flexGrow: 1, gap: 6 },
  statIcon: { width: 30, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  statValue: { color: colors.onSurface, fontSize: 19, fontWeight: "800", fontVariant: ["tabular-nums"] },
  statLabel: { color: colors.muted, fontSize: 12, fontWeight: "600" },
  sectionTitle: { color: colors.onSurface, fontSize: 16, fontWeight: "800", marginBottom: spacing.md },
  legendRow: { flexDirection: "row", gap: spacing.lg, marginBottom: spacing.md },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: colors.onSurfaceSecondary, fontSize: 12, fontWeight: "600" },
  monthBlock: { marginBottom: spacing.md, gap: 4 },
  monthLabel: { color: colors.onSurfaceSecondary, fontSize: 13, fontWeight: "700" },
  barTrack: { height: 12, backgroundColor: colors.surfaceTertiary, borderRadius: 6, overflow: "hidden" },
  bar: { height: "100%", borderRadius: 6, minWidth: 3 },
  barValue: { color: colors.muted, fontSize: 11, fontWeight: "600" },
  topRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.md },
  topModel: { color: colors.onSurfaceSecondary, fontSize: 13, fontWeight: "600", width: 110 },
  topBarTrack: { flex: 1, height: 12, backgroundColor: colors.surfaceTertiary, borderRadius: 6, overflow: "hidden" },
  topQty: { color: colors.onSurface, fontSize: 13, fontWeight: "800", width: 54, textAlign: "right", fontVariant: ["tabular-nums"] },
  dueRow: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.divider },
  dueName: { color: colors.onSurface, fontSize: 14, fontWeight: "700" },
  dueMeta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  dueAmt: { fontSize: 15, fontWeight: "800", fontVariant: ["tabular-nums"] },
  empty: { color: colors.muted, fontSize: 14, paddingVertical: spacing.sm },
}));
