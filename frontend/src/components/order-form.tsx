import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";

import { apiGet, apiPost } from "@/src/api/client";
import { Button, Card, Field } from "@/src/components/ui";
import { Icon } from "@/src/components/icon";
import { ScreenHeader } from "@/src/components/header";
import { SelectField, Option } from "@/src/components/picker";
import { useToast } from "@/src/components/toast";
import { formatINR } from "@/src/lib/format";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

type Line = { key: string; product_id: string; model: string; qty: string; rate: string };

export function OrderForm({ kind }: { kind: "sale" | "purchase" }) {
  const s = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();

  const isSale = kind === "sale";
  const { data: products } = useQuery({ queryKey: ["products"], queryFn: () => apiGet<any[]>("/products") });
  const { data: dealers } = useQuery({ queryKey: ["dealers"], queryFn: () => apiGet<any[]>("/dealers"), enabled: isSale });

  const [partyId, setPartyId] = useState<string | null>(null);
  const [partyName, setPartyName] = useState("");
  const [refNo, setRefNo] = useState("");
  const [notes, setNotes] = useState("");
  const [initialPayment, setInitialPayment] = useState("");
  const [lines, setLines] = useState<Line[]>([]);

  const productOptions: Option[] =
    products?.map((p) => ({ label: p.model, value: p.id, sublabel: `Stock: ${p.qty_on_hand} · Cost ${formatINR(p.cost_price)}` })) || [];
  const dealerOptions: Option[] =
    dealers?.map((d) => ({ label: d.shop_name, value: d.id, sublabel: d.area || d.contact_person })) || [];

  function addLine(opt: Option) {
    const p = products?.find((x) => x.id === opt.value);
    if (!p) return;
    if (lines.some((l) => l.product_id === p.id)) {
      toast.show("Product already added", "info");
      return;
    }
    setLines((prev) => [
      ...prev,
      { key: `${p.id}-${Date.now()}`, product_id: p.id, model: p.model, qty: "1", rate: String(isSale ? p.sell_price : p.cost_price) },
    ]);
  }

  function updateLine(key: string, field: "qty" | "rate", val: string) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, [field]: val.replace(/[^0-9.]/g, "") } : l)));
  }
  function removeLine(key: string) {
    setLines((prev) => prev.filter((l) => l.key !== key));
  }

  const total = lines.reduce((sum, l) => sum + (parseFloat(l.qty) || 0) * (parseFloat(l.rate) || 0), 0);

  const mutation = useMutation({
    mutationFn: () => {
      const body = {
        party_id: isSale ? partyId : null,
        party_name: isSale ? partyName : partyName.trim(),
        ref_no: refNo.trim() || null,
        notes: notes.trim(),
        items: lines.map((l) => ({ product_id: l.product_id, model: l.model, qty: parseFloat(l.qty) || 0, rate: parseFloat(l.rate) || 0 })),
        initial_payment: parseFloat(initialPayment) || 0,
      };
      return apiPost(isSale ? "/sales" : "/purchases", body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [isSale ? "sales" : "purchases"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["reports"] });
      toast.show(isSale ? "Sale order created" : "Purchase order created", "success");
      if (router.canGoBack()) router.back();
      else router.replace((isSale ? "/sales" : "/purchases") as any);
    },
    onError: (e: any) => toast.show(e?.message || "Failed to save", "error"),
  });

  function submit() {
    if (isSale && !partyId) return toast.show("Select a dealer", "error");
    if (!isSale && !partyName.trim()) return toast.show("Enter supplier name", "error");
    if (lines.length === 0) return toast.show("Add at least one product", "error");
    if (lines.some((l) => !(parseFloat(l.qty) > 0))) return toast.show("Enter valid quantity", "error");
    mutation.mutate();
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
      <ScreenHeader title={isSale ? "New Sale Order" : "New Purchase Order"} subtitle={isSale ? "Invoice to a dealer" : "Order from supplier"} showBack />
      <KeyboardAwareScrollView
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: insets.bottom + spacing["3xl"] }}
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
      >
        <Card style={{ gap: spacing.md }}>
          {isSale ? (
            <SelectField
              label="Dealer"
              placeholder="Select dealer"
              value={partyId}
              options={dealerOptions}
              onSelect={(o) => {
                setPartyId(o.value);
                setPartyName(o.label);
              }}
              testID="select-dealer"
            />
          ) : (
            <Field label="Supplier" value={partyName} onChangeText={setPartyName} placeholder="Supplier name" testID="input-supplier" />
          )}
          <Field label={isSale ? "Invoice No. (optional)" : "PO No. (optional)"} value={refNo} onChangeText={setRefNo} placeholder="e.g. INV-001" testID="input-refno" />
        </Card>

        <View>
          <View style={s.rowBetween}>
            <Text style={s.sectionTitle}>Items</Text>
            <Text style={s.itemCount}>{lines.length} added</Text>
          </View>

          {lines.map((l) => {
            const amt = (parseFloat(l.qty) || 0) * (parseFloat(l.rate) || 0);
            return (
              <Card key={l.key} style={{ gap: spacing.sm, marginBottom: spacing.md }} testID={`line-${l.product_id}`}>
                <View style={s.rowBetween}>
                  <Text style={s.lineModel} numberOfLines={1}>
                    {l.model}
                  </Text>
                  <Pressable onPress={() => removeLine(l.key)} hitSlop={8} testID={`remove-line-${l.product_id}`}>
                    <Icon name="trash-can-outline" size={20} color={colors.error} />
                  </Pressable>
                </View>
                <View style={{ flexDirection: "row", gap: spacing.md }}>
                  <View style={{ flex: 1 }}>
                    <Field label="Qty" value={l.qty} onChangeText={(v) => updateLine(l.key, "qty", v)} keyboardType="numeric" testID={`qty-${l.product_id}`} />
                  </View>
                  <View style={{ flex: 1.4 }}>
                    <Field label="Rate / unit" value={l.rate} onChangeText={(v) => updateLine(l.key, "rate", v)} keyboardType="numeric" testID={`rate-${l.product_id}`} />
                  </View>
                </View>
                <Text style={s.lineAmount}>Amount: {formatINR(amt)}</Text>
              </Card>
            );
          })}

          <SelectField
            placeholder="+ Add product"
            value={null}
            options={productOptions}
            onSelect={addLine}
            testID="add-product"
          />
        </View>

        <Card style={{ gap: spacing.md }}>
          <Field
            label={isSale ? "Payment received now (optional)" : "Payment made now (optional)"}
            value={initialPayment}
            onChangeText={(v) => setInitialPayment(v.replace(/[^0-9.]/g, ""))}
            keyboardType="numeric"
            placeholder="0"
            testID="input-initial-payment"
          />
          <Field label="Notes (optional)" value={notes} onChangeText={setNotes} placeholder="Any remarks" multiline testID="input-notes" />
        </Card>

        <View style={s.totalRow}>
          <Text style={s.totalLabel}>Order Total</Text>
          <Text style={s.totalValue} testID="order-total">
            {formatINR(total)}
          </Text>
        </View>

        <Button title={isSale ? "Create Sale Order" : "Create Purchase Order"} onPress={submit} loading={mutation.isPending} icon="check" testID="submit-order" />
      </KeyboardAwareScrollView>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { color: colors.onSurface, fontSize: 17, fontWeight: "800", marginBottom: spacing.md },
  itemCount: { color: colors.muted, fontSize: 13, fontWeight: "600", marginBottom: spacing.md },
  lineModel: { color: colors.onSurface, fontSize: 15, fontWeight: "700", flex: 1 },
  lineAmount: { color: colors.brandPrimary, fontSize: 14, fontWeight: "700" },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.brandTertiary,
    padding: spacing.lg,
    borderRadius: radius.md,
  },
  totalLabel: { color: colors.onBrandTertiary, fontSize: 15, fontWeight: "700" },
  totalValue: { color: colors.onBrandTertiary, fontSize: 22, fontWeight: "800", fontVariant: ["tabular-nums"] },
}));
