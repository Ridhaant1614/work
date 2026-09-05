import { useState } from "react";
import { FlatList, Modal, Pressable, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { apiGet, apiPost, apiDelete } from "@/src/api/client";
import { Button, Card, ErrorState, Field, Loading, EmptyState } from "@/src/components/ui";
import { Icon, IconName } from "@/src/components/icon";
import { ScreenHeader } from "@/src/components/header";
import { useToast } from "@/src/components/toast";
import { formatINR, formatDate } from "@/src/lib/format";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

const CATEGORIES: { label: string; icon: IconName }[] = [
  { label: "Transport", icon: "truck" },
  { label: "Rent", icon: "home-city" },
  { label: "Salary", icon: "account-cash" },
  { label: "Utilities", icon: "flash" },
  { label: "Marketing", icon: "bullhorn" },
  { label: "Misc", icon: "dots-horizontal" },
];

function catIcon(cat: string): IconName {
  return CATEGORIES.find((c) => c.label === cat)?.icon || "cash";
}

export default function Expenses() {
  const s = useStyles();
  const { colors } = useTheme();
  const toast = useToast();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();

  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("Transport");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => apiGet<any[]>("/expenses"),
  });

  const total = data?.reduce((a, e) => a + (e.amount || 0), 0) || 0;

  const saveMutation = useMutation({
    mutationFn: () => apiPost("/expenses", { category, amount: parseFloat(amount) || 0, note: note.trim() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["reports"] });
      setOpen(false);
      setAmount("");
      setNote("");
      toast.show("Expense added", "success");
    },
    onError: (e: any) => toast.show(e?.message || "Failed", "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/expenses/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["reports"] });
      toast.show("Expense deleted", "info");
    },
  });

  function save() {
    if (!(parseFloat(amount) > 0)) return toast.show("Enter a valid amount", "error");
    saveMutation.mutate();
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
      <ScreenHeader title="Daily Expenses" subtitle="Track your spending" showBack rightIcon="plus-circle" onRightPress={() => setOpen(true)} rightTestID="expense-add" />

      {isLoading ? (
        <Loading testID="expenses-loading" />
      ) : isError ? (
        <ErrorState onRetry={refetch} testID="expenses-error" />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(e) => e.id}
          onRefresh={refetch}
          refreshing={isRefetching}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: insets.bottom + spacing.xl }}
          showsVerticalScrollIndicator={false}
          testID="expenses-list"
          ListHeaderComponent={
            <Card style={s.totalCard} testID="expense-total">
              <Text style={s.totalLabel}>Total Expenses</Text>
              <Text style={s.totalValue}>{formatINR(total)}</Text>
            </Card>
          }
          ListEmptyComponent={<EmptyState title="No expenses yet" subtitle="Log your first expense." actionLabel="Add Expense" onAction={() => setOpen(true)} testID="expenses-empty" />}
          renderItem={({ item }) => (
            <View style={s.row} testID={`expense-${item.id}`}>
              <View style={s.icon}>
                <Icon name={catIcon(item.category)} size={20} color={colors.brandPrimary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.cat}>{item.category}</Text>
                <Text style={s.meta}>
                  {formatDate(item.date)}
                  {item.note ? ` · ${item.note}` : ""}
                </Text>
              </View>
              <Text style={s.amt}>{formatINR(item.amount)}</Text>
              <Pressable onPress={() => deleteMutation.mutate(item.id)} hitSlop={8} style={{ marginLeft: spacing.sm }} testID={`expense-delete-${item.id}`}>
                <Icon name="trash-can-outline" size={18} color={colors.error} />
              </Pressable>
            </View>
          )}
        />
      )}

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={s.backdrop}>
          <View style={[s.sheet, { paddingBottom: insets.bottom + spacing.md }]}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>Add Expense</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={10} testID="expense-form-close">
                <Icon name="close" size={24} color={colors.onSurface} />
              </Pressable>
            </View>
            <KeyboardAwareScrollView contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.md }} bottomOffset={16} keyboardShouldPersistTaps="handled">
              <Text style={s.fieldLabel}>Category</Text>
              <View style={s.catGrid}>
                {CATEGORIES.map((c) => {
                  const active = category === c.label;
                  return (
                    <Pressable
                      key={c.label}
                      onPress={() => setCategory(c.label)}
                      style={[s.catChip, active ? { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary } : { backgroundColor: colors.surface, borderColor: colors.border }]}
                      testID={`cat-${c.label}`}
                    >
                      <Icon name={c.icon} size={16} color={active ? colors.onBrandPrimary : colors.onSurfaceSecondary} />
                      <Text style={[s.catText, { color: active ? colors.onBrandPrimary : colors.onSurfaceSecondary }]}>{c.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Field label="Amount (₹)" value={amount} onChangeText={(v) => setAmount(v.replace(/[^0-9.]/g, ""))} keyboardType="numeric" placeholder="0" testID="ef-amount" />
              <Field label="Note (optional)" value={note} onChangeText={setNote} placeholder="What was this for?" testID="ef-note" />
              <Button title="Add Expense" onPress={save} loading={saveMutation.isPending} icon="check" testID="ef-save" />
            </KeyboardAwareScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  totalCard: { alignItems: "center", gap: 4, marginBottom: spacing.md, backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  totalLabel: { color: colors.onBrandPrimary, fontSize: 13, fontWeight: "600", opacity: 0.9 },
  totalValue: { color: colors.onBrandPrimary, fontSize: 28, fontWeight: "800", fontVariant: ["tabular-nums"] },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  icon: { width: 42, height: 42, borderRadius: 12, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
  cat: { color: colors.onSurface, fontSize: 15, fontWeight: "700" },
  meta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  amt: { color: colors.onSurface, fontSize: 16, fontWeight: "800", fontVariant: ["tabular-nums"] },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, maxHeight: "88%" },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
  sheetTitle: { color: colors.onSurface, fontSize: 18, fontWeight: "800" },
  fieldLabel: { color: colors.onSurfaceSecondary, fontSize: 13, fontWeight: "600" },
  catGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  catChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 9, borderRadius: radius.pill, borderWidth: 1 },
  catText: { fontSize: 13, fontWeight: "600" },
}));
