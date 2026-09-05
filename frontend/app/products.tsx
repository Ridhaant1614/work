import { useState } from "react";
import { FlatList, Modal, Pressable, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { apiGet, apiPost, apiPut, apiDelete } from "@/src/api/client";
import { Badge, Button, ErrorState, Field, Loading } from "@/src/components/ui";
import { Icon } from "@/src/components/icon";
import { ScreenHeader } from "@/src/components/header";
import { useToast } from "@/src/components/toast";
import { formatINR } from "@/src/lib/format";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

type Draft = { id?: string; model: string; sku: string; category: string; cost_price: string; sell_price: string; qty_on_hand: string };

const EMPTY: Draft = { model: "", sku: "", category: "Television", cost_price: "", sell_price: "", qty_on_hand: "0" };

export default function Products() {
  const s = useStyles();
  const { colors } = useTheme();
  const toast = useToast();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY);

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["products"],
    queryFn: () => apiGet<any[]>("/products"),
  });

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["products"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    qc.invalidateQueries({ queryKey: ["reports"] });
  }

  const saveMutation = useMutation({
    mutationFn: () => {
      const body = {
        model: draft.model.trim(),
        sku: draft.sku.trim() || undefined,
        category: draft.category.trim() || "Television",
        cost_price: parseFloat(draft.cost_price) || 0,
        sell_price: parseFloat(draft.sell_price) || 0,
        qty_on_hand: parseFloat(draft.qty_on_hand) || 0,
      };
      return draft.id ? apiPut(`/products/${draft.id}`, body) : apiPost("/products", body);
    },
    onSuccess: () => {
      invalidate();
      setOpen(false);
      toast.show(draft.id ? "Product updated" : "Product added", "success");
    },
    onError: (e: any) => toast.show(e?.message || "Failed", "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/products/${id}`),
    onSuccess: () => {
      invalidate();
      toast.show("Product removed", "info");
    },
    onError: (e: any) => toast.show(e?.message || "Failed", "error"),
  });

  function openNew() {
    setDraft(EMPTY);
    setOpen(true);
  }
  function openEdit(p: any) {
    setDraft({
      id: p.id,
      model: p.model,
      sku: p.sku || "",
      category: p.category || "Television",
      cost_price: String(p.cost_price ?? ""),
      sell_price: String(p.sell_price ?? ""),
      qty_on_hand: String(p.qty_on_hand ?? 0),
    });
    setOpen(true);
  }
  function save() {
    if (!draft.model.trim()) return toast.show("Enter a model name", "error");
    saveMutation.mutate();
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
      <ScreenHeader title="Products & Cost Sheet" subtitle="SKUs, models & costing" showBack rightIcon="plus-circle" onRightPress={openNew} rightTestID="product-add" />

      {isLoading ? (
        <Loading testID="products-loading" />
      ) : isError ? (
        <ErrorState onRetry={refetch} testID="products-error" />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(p) => p.id}
          onRefresh={refetch}
          refreshing={isRefetching}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: insets.bottom + spacing.xl }}
          showsVerticalScrollIndicator={false}
          testID="products-list"
          renderItem={({ item }) => (
            <Pressable style={s.card} onPress={() => openEdit(item)} testID={`product-${item.id}`}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={s.model} numberOfLines={1}>
                  {item.model}
                </Text>
                <Text style={s.sku}>{item.sku}</Text>
                <View style={s.priceRow}>
                  <View style={s.pricePill}>
                    <Text style={s.priceLabel}>Cost</Text>
                    <Text style={s.priceValue}>{formatINR(item.cost_price)}</Text>
                  </View>
                  <View style={s.pricePill}>
                    <Text style={s.priceLabel}>Sell</Text>
                    <Text style={s.priceValue}>{formatINR(item.sell_price)}</Text>
                  </View>
                  <Badge label={`${item.qty_on_hand} qty`} tone="brand" />
                </View>
              </View>
              <View style={{ gap: spacing.md, alignItems: "center" }}>
                <Icon name="pencil" size={18} color={colors.brandPrimary} />
                <Pressable onPress={() => deleteMutation.mutate(item.id)} hitSlop={8} testID={`product-delete-${item.id}`}>
                  <Icon name="trash-can-outline" size={18} color={colors.error} />
                </Pressable>
              </View>
            </Pressable>
          )}
        />
      )}

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={s.backdrop}>
          <View style={[s.sheet, { paddingBottom: insets.bottom + spacing.md }]}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>{draft.id ? "Edit Product" : "Add Product"}</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={10} testID="product-form-close">
                <Icon name="close" size={24} color={colors.onSurface} />
              </Pressable>
            </View>
            <KeyboardAwareScrollView contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.md }} bottomOffset={16} keyboardShouldPersistTaps="handled">
              <Field label="Model" value={draft.model} onChangeText={(v) => setDraft({ ...draft, model: v })} placeholder="e.g. 43 Worldtech BT" testID="pf-model" />
              <Field label="SKU (optional)" value={draft.sku} onChangeText={(v) => setDraft({ ...draft, sku: v })} placeholder="Auto-generated if blank" testID="pf-sku" />
              <Field label="Category" value={draft.category} onChangeText={(v) => setDraft({ ...draft, category: v })} placeholder="Television" testID="pf-category" />
              <View style={{ flexDirection: "row", gap: spacing.md }}>
                <View style={{ flex: 1 }}>
                  <Field label="Cost / unit (₹)" value={draft.cost_price} onChangeText={(v) => setDraft({ ...draft, cost_price: v.replace(/[^0-9.]/g, "") })} keyboardType="numeric" placeholder="0" testID="pf-cost" />
                </View>
                <View style={{ flex: 1 }}>
                  <Field label="Sell / unit (₹)" value={draft.sell_price} onChangeText={(v) => setDraft({ ...draft, sell_price: v.replace(/[^0-9.]/g, "") })} keyboardType="numeric" placeholder="0" testID="pf-sell" />
                </View>
              </View>
              <Field label="Stock on hand" value={draft.qty_on_hand} onChangeText={(v) => setDraft({ ...draft, qty_on_hand: v.replace(/[^0-9.]/g, "") })} keyboardType="numeric" placeholder="0" testID="pf-qty" />
              <Text style={s.hint}>Stock auto-updates with purchase & sales orders. Edit here only for manual corrections.</Text>
              <Button title={draft.id ? "Save Changes" : "Add Product"} onPress={save} loading={saveMutation.isPending} icon="check" testID="pf-save" />
            </KeyboardAwareScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  model: { color: colors.onSurface, fontSize: 15, fontWeight: "700" },
  sku: { color: colors.muted, fontSize: 12 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: 6, flexWrap: "wrap" },
  pricePill: { backgroundColor: colors.surfaceTertiary, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 4, flexDirection: "row", gap: 5, alignItems: "center" },
  priceLabel: { color: colors.muted, fontSize: 11, fontWeight: "600" },
  priceValue: { color: colors.onSurface, fontSize: 12, fontWeight: "800" },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, maxHeight: "88%" },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
  sheetTitle: { color: colors.onSurface, fontSize: 18, fontWeight: "800" },
  hint: { color: colors.muted, fontSize: 12 },
}));
