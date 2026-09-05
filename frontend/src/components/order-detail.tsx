import { useState } from "react";
import { Modal, Platform, Pressable, Text, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";

import { apiDelete, apiGet, apiPatch, apiPost } from "@/src/api/client";
import { Badge, Button, Card, Field, Loading, ErrorState } from "@/src/components/ui";
import { Icon } from "@/src/components/icon";
import { ScreenHeader } from "@/src/components/header";
import { useToast } from "@/src/components/toast";
import { formatINR, formatDate } from "@/src/lib/format";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

export function OrderDetail({ kind }: { kind: "sale" | "purchase" }) {
  const s = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const isSale = kind === "sale";
  const listKey = isSale ? "sales" : "purchases";
  const balanceLabel = isSale ? "Receivable" : "Payable";
  const partyLabel = isSale ? "Dealer" : "Supplier";

  const [payAmount, setPayAmount] = useState("");
  const [payNote, setPayNote] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editRef, setEditRef] = useState("");
  const [editDate, setEditDate] = useState<Date>(new Date());
  const [showPicker, setShowPicker] = useState(false);

  const { data: o, isLoading, isError, refetch } = useQuery({
    queryKey: [listKey, id],
    queryFn: () => apiGet(`${isSale ? "/sales" : "/purchases"}/${id}`),
  });

  function invalidateAll() {
    qc.invalidateQueries({ queryKey: [listKey] });
    qc.invalidateQueries({ queryKey: [listKey, id] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    qc.invalidateQueries({ queryKey: ["reports"] });
    qc.invalidateQueries({ queryKey: ["products"] });
  }

  const payMutation = useMutation({
    mutationFn: () => apiPost(`/orders/${id}/payments`, { amount: parseFloat(payAmount) || 0, note: payNote.trim() }),
    onSuccess: () => {
      setPayAmount("");
      setPayNote("");
      invalidateAll();
      refetch();
      toast.show("Payment recorded", "success");
    },
    onError: (e: any) => toast.show(e?.message || "Failed", "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiDelete(`/orders/${id}`),
    onSuccess: () => {
      invalidateAll();
      toast.show("Order deleted, stock reversed", "info");
      if (router.canGoBack()) router.back();
      else router.replace((isSale ? "/sales" : "/purchases") as any);
    },
    onError: (e: any) => toast.show(e?.message || "Failed", "error"),
  });

  const editMutation = useMutation({
    mutationFn: () => apiPatch(`/orders/${id}`, { ref_no: editRef.trim() || null, date: editDate.toISOString() }),
    onSuccess: () => {
      invalidateAll();
      refetch();
      setEditOpen(false);
      toast.show("Invoice details updated", "success");
    },
    onError: (e: any) => toast.show(e?.message || "Failed", "error"),
  });

  function openEdit() {
    setEditRef(o?.ref_no || "");
    setEditDate(o?.date ? new Date(o.date) : new Date());
    setEditOpen(true);
  }

  function addPayment() {
    const amt = parseFloat(payAmount) || 0;
    if (amt <= 0) return toast.show("Enter a valid amount", "error");
    if (o && amt > o.balance + 0.5) return toast.show(`Max ${balanceLabel.toLowerCase()} is ${formatINR(o.balance)}`, "error");
    payMutation.mutate();
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
      <ScreenHeader
        title={isSale ? "Sale Order" : "Purchase Order"}
        subtitle={o?.ref_no || undefined}
        showBack
        rightIcon="trash-can-outline"
        onRightPress={() => setConfirmDelete(true)}
        rightTestID="delete-order"
      />

      {isLoading ? (
        <Loading testID="detail-loading" />
      ) : isError || !o ? (
        <ErrorState onRetry={refetch} testID="detail-error" />
      ) : (
        <KeyboardAwareScrollView
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: insets.bottom + spacing["3xl"] }}
          bottomOffset={24}
          keyboardShouldPersistTaps="handled"
        >
          {/* Summary */}
          <Card style={{ gap: spacing.sm }} testID="order-summary">
            <View style={s.rowBetween}>
              <Text style={s.party}>{o.party_name}</Text>
              <Badge label={o.pay_status} tone={o.pay_status === "cleared" ? "success" : o.pay_status === "partial" ? "warning" : "error"} />
            </View>
            <Text style={s.meta}>
              {partyLabel} · {formatDate(o.date)}
            </Text>
            <Pressable style={s.editRow} onPress={openEdit} testID="edit-invoice">
              <Icon name="receipt-text-edit-outline" size={16} color={colors.brandPrimary} />
              <Text style={s.editRowText}>
                {o.ref_no ? `Invoice ${o.ref_no}` : "Add invoice number"} · {formatDate(o.date)}
              </Text>
              <Icon name="pencil" size={14} color={colors.muted} />
            </Pressable>
            <View style={s.amountBox}>
              <View style={s.amountCol}>
                <Text style={s.amountLabel}>Total</Text>
                <Text style={s.amountValue}>{formatINR(o.total)}</Text>
              </View>
              <View style={s.amountCol}>
                <Text style={s.amountLabel}>{isSale ? "Received" : "Paid"}</Text>
                <Text style={[s.amountValue, { color: colors.success }]}>{formatINR(o.amount_paid)}</Text>
              </View>
              <View style={s.amountCol}>
                <Text style={s.amountLabel}>{balanceLabel}</Text>
                <Text style={[s.amountValue, { color: o.balance > 0 ? colors.error : colors.onSurface }]}>{formatINR(o.balance)}</Text>
              </View>
            </View>
            {o.balance > 0 && o.age_days > 0 ? (
              <Text style={s.aging}>
                <Icon name="clock-alert-outline" size={13} color={colors.warning} /> Outstanding since {o.age_days} day{o.age_days === 1 ? "" : "s"}
              </Text>
            ) : null}
            {o.notes ? <Text style={s.notes}>{o.notes}</Text> : null}
          </Card>

          {/* Items */}
          <View>
            <Text style={s.sectionTitle}>Items</Text>
            <Card style={{ padding: 0 }}>
              {o.items.map((it: any, i: number) => (
                <View key={i} style={[s.itemRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.divider }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.itemModel}>{it.model}</Text>
                    <Text style={s.itemMeta}>
                      {it.qty} × {formatINR(it.rate)}
                    </Text>
                  </View>
                  <Text style={s.itemAmt}>{formatINR(it.amount)}</Text>
                </View>
              ))}
            </Card>
          </View>

          {/* Payments */}
          <View>
            <Text style={s.sectionTitle}>Payment History</Text>
            {o.payments?.length ? (
              <Card style={{ padding: 0, marginBottom: spacing.md }}>
                {o.payments.map((p: any, i: number) => (
                  <View key={p.id} style={[s.itemRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.divider }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.itemModel}>{formatINR(p.amount)}</Text>
                      <Text style={s.itemMeta}>
                        {formatDate(p.date)}
                        {p.note ? ` · ${p.note}` : ""}
                      </Text>
                    </View>
                    <Icon name="check-circle" size={18} color={colors.success} />
                  </View>
                ))}
              </Card>
            ) : (
              <Card style={{ marginBottom: spacing.md }}>
                <Text style={s.itemMeta}>No payments recorded yet.</Text>
              </Card>
            )}

            {o.balance > 0 ? (
              <Card style={{ gap: spacing.md }}>
                <Text style={s.addPayTitle}>Record {isSale ? "payment received" : "payment made"}</Text>
                <Field label="Amount" value={payAmount} onChangeText={(v) => setPayAmount(v.replace(/[^0-9.]/g, ""))} keyboardType="numeric" placeholder={`Up to ${formatINR(o.balance)}`} testID="pay-amount" />
                <Field label="Note (optional)" value={payNote} onChangeText={setPayNote} placeholder="e.g. UPI / Cheque" testID="pay-note" />
                <Button title="Add Payment" onPress={addPayment} loading={payMutation.isPending} icon="cash-plus" testID="add-payment" />
              </Card>
            ) : null}
          </View>
        </KeyboardAwareScrollView>
      )}

      {/* Delete confirm */}
      <Modal visible={confirmDelete} transparent animationType="fade" onRequestClose={() => setConfirmDelete(false)}>
        <View style={s.backdrop}>
          <View style={s.confirmCard}>
            <Icon name="alert-circle-outline" size={40} color={colors.error} />
            <Text style={s.confirmTitle}>Delete this order?</Text>
            <Text style={s.confirmSub}>Stock changes from this order will be reversed. This cannot be undone.</Text>
            <View style={{ flexDirection: "row", gap: spacing.md, marginTop: spacing.md }}>
              <View style={{ flex: 1 }}>
                <Button title="Cancel" onPress={() => setConfirmDelete(false)} variant="outline" testID="cancel-delete" />
              </View>
              <View style={{ flex: 1 }}>
                <Button title="Delete" onPress={() => { setConfirmDelete(false); deleteMutation.mutate(); }} variant="danger" testID="confirm-delete" />
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit invoice & date */}
      <Modal visible={editOpen} animationType="slide" transparent onRequestClose={() => setEditOpen(false)}>
        <View style={s.backdrop}>
          <View style={[s.editSheet, { paddingBottom: insets.bottom + spacing.md }]}>
            <View style={s.rowBetween}>
              <Text style={s.editTitle}>Invoice & Date</Text>
              <Pressable onPress={() => setEditOpen(false)} hitSlop={10} testID="edit-close">
                <Icon name="close" size={24} color={colors.onSurface} />
              </Pressable>
            </View>
            <Field label={isSale ? "Invoice Number" : "PO Number"} value={editRef} onChangeText={setEditRef} placeholder="e.g. INV-001" testID="edit-ref" />
            <Text style={s.dateLabel}>Order Date</Text>
            <Pressable style={s.dateBtn} onPress={() => setShowPicker(true)} testID="edit-date-btn">
              <Icon name="calendar" size={18} color={colors.brandPrimary} />
              <Text style={s.dateText}>{formatDate(editDate.toISOString())}</Text>
            </Pressable>
            {showPicker ? (
              <DateTimePicker
                value={editDate}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(_e, d) => {
                  setShowPicker(Platform.OS === "ios");
                  if (d) setEditDate(d);
                }}
                testID="edit-date-picker"
              />
            ) : null}
            <View style={{ marginTop: spacing.md }}>
              <Button title="Save" onPress={() => editMutation.mutate()} loading={editMutation.isPending} icon="check" testID="edit-save" />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  party: { color: colors.onSurface, fontSize: 18, fontWeight: "800", flex: 1 },
  meta: { color: colors.muted, fontSize: 13 },
  editRow: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.brandTertiary, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10, marginTop: 4 },
  editRowText: { color: colors.onBrandTertiary, fontSize: 13, fontWeight: "700", flex: 1 },
  amountBox: { flexDirection: "row", backgroundColor: colors.surfaceTertiary, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.sm },
  amountCol: { flex: 1, alignItems: "center", gap: 3 },
  amountLabel: { color: colors.muted, fontSize: 12, fontWeight: "600" },
  amountValue: { color: colors.onSurface, fontSize: 15, fontWeight: "800", fontVariant: ["tabular-nums"] },
  aging: { color: colors.warning, fontSize: 12, fontWeight: "700", marginTop: 4 },
  notes: { color: colors.onSurfaceSecondary, fontSize: 13, marginTop: 4, fontStyle: "italic" },
  sectionTitle: { color: colors.onSurface, fontSize: 17, fontWeight: "800", marginBottom: spacing.md },
  itemRow: { flexDirection: "row", alignItems: "center", padding: spacing.lg },
  itemModel: { color: colors.onSurface, fontSize: 15, fontWeight: "700" },
  itemMeta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  itemAmt: { color: colors.onSurface, fontSize: 15, fontWeight: "800", fontVariant: ["tabular-nums"] },
  addPayTitle: { color: colors.onSurface, fontSize: 15, fontWeight: "800" },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", padding: spacing.xl },
  confirmCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl, alignItems: "center", gap: 8, width: "100%", maxWidth: 360 },
  confirmTitle: { color: colors.onSurface, fontSize: 18, fontWeight: "800" },
  confirmSub: { color: colors.muted, fontSize: 14, textAlign: "center" },
  editSheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, gap: spacing.md },
  editTitle: { color: colors.onSurface, fontSize: 18, fontWeight: "800" },
  dateLabel: { color: colors.onSurfaceSecondary, fontSize: 13, fontWeight: "600" },
  dateBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.surfaceTertiary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 13 },
  dateText: { color: colors.onSurface, fontSize: 15, fontWeight: "600" },
}));
