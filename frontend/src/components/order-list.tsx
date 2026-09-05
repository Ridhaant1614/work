import { useState, useMemo } from "react";
import { FlatList, Pressable, ScrollView, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { apiGet } from "@/src/api/client";
import { Badge, EmptyState, ErrorState, Loading } from "@/src/components/ui";
import { Icon } from "@/src/components/icon";
import { ScreenHeader } from "@/src/components/header";
import { formatINR, shortDate } from "@/src/lib/format";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "unpaid", label: "Unpaid" },
  { key: "partial", label: "Partial" },
  { key: "cleared", label: "Cleared" },
];

export function OrderListScreen({
  kind,
  title,
  emptyImage,
}: {
  kind: "sale" | "purchase";
  title: string;
  emptyImage: string;
}) {
  const s = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState("all");

  const endpoint = kind === "sale" ? "/sales" : "/purchases";
  const createRoute = kind === "sale" ? "/sales/new" : "/purchases/new";
  const detailBase = kind === "sale" ? "/sales" : "/purchases";
  const partyLabel = kind === "sale" ? "Dealer" : "Supplier";
  const balanceLabel = kind === "sale" ? "Receivable" : "Payable";

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: [kind === "sale" ? "sales" : "purchases"],
    queryFn: () => apiGet<any[]>(endpoint),
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    if (filter === "all") return data;
    return data.filter((o) => o.pay_status === filter);
  }, [data, filter]);

  const renderItem = ({ item }: { item: any }) => (
    <Pressable
      onPress={() => router.push(`${detailBase}/${item.id}` as any)}
      style={({ pressed }) => [s.tile, pressed && { opacity: 0.75 }]}
      testID={`order-${item.id}`}
    >
      <View style={s.tileLeft}>
        <View style={s.tileIcon}>
          <Icon name={kind === "sale" ? "receipt" : "package-down"} size={20} color={colors.brandPrimary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.tileParty} numberOfLines={1}>
            {item.party_name}
          </Text>
          <Text style={s.tileMeta} numberOfLines={1}>
            {item.ref_no || "No ref"} · {shortDate(item.date)}
          </Text>
          {item.balance > 0 ? (
            <Text style={s.tileBalance}>
              {balanceLabel} {formatINR(item.balance)}
              {item.age_days > 0 ? ` · ${item.age_days}d` : ""}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={s.tileRight}>
        <Text style={s.tileAmount}>{formatINR(item.total)}</Text>
        <Badge
          label={item.pay_status}
          tone={item.pay_status === "cleared" ? "success" : item.pay_status === "partial" ? "warning" : "error"}
        />
      </View>
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
      <ScreenHeader
        title={title}
        subtitle={`${partyLabel} orders & payments`}
        rightIcon="plus-circle"
        onRightPress={() => router.push(createRoute as any)}
        rightTestID={`${kind}-add`}
      />

      {/* Sticky filter chip row */}
      <View style={s.chipBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.lg }}
        >
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <Pressable
                key={f.key}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setFilter(f.key);
                }}
                style={[s.chip, active ? s.chipActive : s.chipInactive]}
                testID={`filter-${f.key}`}
              >
                <Text style={[s.chipText, { color: active ? colors.onBrandPrimary : colors.onSurfaceSecondary }]}>
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {isLoading ? (
        <Loading testID={`${kind}-loading`} />
      ) : isError ? (
        <ErrorState onRetry={refetch} testID={`${kind}-error`} />
      ) : filtered.length === 0 ? (
        <EmptyState
          image={emptyImage}
          title={data && data.length ? "Nothing here" : `No ${title.toLowerCase()} yet`}
          subtitle={data && data.length ? "No orders match this filter." : `Create your first ${kind} order.`}
          actionLabel={`New ${kind === "sale" ? "Sale" : "Purchase"}`}
          onAction={() => router.push(createRoute as any)}
          testID={`${kind}-empty`}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(o) => o.id}
          renderItem={renderItem}
          onRefresh={refetch}
          refreshing={isRefetching}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: insets.bottom + 100 }}
          showsVerticalScrollIndicator={false}
          testID={`${kind}-list`}
        />
      )}

      {/* Floating action button */}
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
          router.push(createRoute as any);
        }}
        style={[s.fab, { bottom: spacing.xl }]}
        testID={`${kind}-fab`}
      >
        <Icon name="plus" size={26} color={colors.onBrandPrimary} />
      </Pressable>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  chipBar: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  chip: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    borderWidth: 1,
  },
  chipActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  chipInactive: { backgroundColor: colors.surface, borderColor: colors.border },
  chipText: { fontSize: 14, fontWeight: "600" },
  tile: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  tileLeft: { flexDirection: "row", alignItems: "center", gap: spacing.md, flex: 1 },
  tileIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
  tileParty: { color: colors.onSurface, fontSize: 15, fontWeight: "700" },
  tileMeta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  tileBalance: { color: colors.warning, fontSize: 12, fontWeight: "700", marginTop: 3 },
  tileRight: { alignItems: "flex-end", gap: 6 },
  tileAmount: { color: colors.onSurface, fontSize: 16, fontWeight: "800", fontVariant: ["tabular-nums"] },
  fab: {
    position: "absolute",
    right: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
}));
