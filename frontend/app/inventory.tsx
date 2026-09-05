import { useMemo, useState } from "react";
import { FlatList, Text, TextInput, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { apiGet } from "@/src/api/client";
import { Badge, ErrorState, Loading, EmptyState } from "@/src/components/ui";
import { Icon } from "@/src/components/icon";
import { ScreenHeader } from "@/src/components/header";
import { formatINR } from "@/src/lib/format";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

export default function Inventory() {
  const s = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["products"],
    queryFn: () => apiGet<any[]>("/products"),
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    if (!q) return data;
    return data.filter((p) => p.model.toLowerCase().includes(q) || (p.sku || "").toLowerCase().includes(q));
  }, [data, query]);

  const totalUnits = data?.reduce((a, p) => a + (p.qty_on_hand || 0), 0) || 0;
  const totalValue = data?.reduce((a, p) => a + (p.qty_on_hand || 0) * (p.cost_price || 0), 0) || 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
      <ScreenHeader title="Inventory" subtitle={`${totalUnits} units · ${formatINR(totalValue)}`} showBack />

      <View style={s.searchBar}>
        <View style={s.searchBox}>
          <Icon name="magnify" size={20} color={colors.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search model or SKU"
            placeholderTextColor={colors.muted}
            style={s.searchInput}
            testID="inventory-search"
          />
        </View>
      </View>

      {isLoading ? (
        <Loading testID="inventory-loading" />
      ) : isError ? (
        <ErrorState onRetry={refetch} testID="inventory-error" />
      ) : filtered.length === 0 ? (
        <EmptyState title="No products" subtitle="Add products in the Cost Sheet." testID="inventory-empty" />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(p) => p.id}
          onRefresh={refetch}
          refreshing={isRefetching}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: insets.bottom + spacing.xl }}
          showsVerticalScrollIndicator={false}
          testID="inventory-list"
          renderItem={({ item }) => {
            const low = item.qty_on_hand <= 2;
            return (
              <View style={s.row} testID={`inv-${item.id}`}>
                <View style={s.thumb}>
                  <Icon name="television" size={24} color={colors.brandPrimary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.model} numberOfLines={1}>
                    {item.model}
                  </Text>
                  <Text style={s.sku}>Cost {formatINR(item.cost_price)} · Sell {formatINR(item.sell_price)}</Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 4 }}>
                  <Text style={[s.qty, low && { color: item.qty_on_hand <= 0 ? colors.error : colors.warning }]}>{item.qty_on_hand}</Text>
                  {low ? <Badge label={item.qty_on_hand <= 0 ? "Out" : "Low"} tone={item.qty_on_hand <= 0 ? "error" : "warning"} /> : <Text style={s.inStock}>in stock</Text>}
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  searchBar: { backgroundColor: colors.surface, padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.divider },
  searchBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.surfaceTertiary, borderRadius: radius.md, paddingHorizontal: 12 },
  searchInput: { flex: 1, color: colors.onSurface, fontSize: 15, paddingVertical: 11 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  thumb: { width: 48, height: 48, borderRadius: 12, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
  model: { color: colors.onSurface, fontSize: 15, fontWeight: "700" },
  sku: { color: colors.muted, fontSize: 12, marginTop: 3 },
  qty: { color: colors.onSurface, fontSize: 20, fontWeight: "800", fontVariant: ["tabular-nums"] },
  inStock: { color: colors.muted, fontSize: 11 },
}));
