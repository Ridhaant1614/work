import { useState } from "react";
import { FlatList, Linking, Modal, Pressable, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "@/src/components/keyboard-scroll";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { apiGet, apiPost, apiPut, apiDelete } from "@/src/api/client";
import { Button, ErrorState, Field, InitialsAvatar, Loading, EmptyState } from "@/src/components/ui";
import { Icon } from "@/src/components/icon";
import { ScreenHeader } from "@/src/components/header";
import { useToast } from "@/src/components/toast";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

type Draft = { id?: string; shop_name: string; contact_person: string; phone: string; whatsapp: string; area: string; notes: string };
const EMPTY: Draft = { shop_name: "", contact_person: "", phone: "", whatsapp: "", area: "", notes: "" };

export default function Dealers() {
  const s = useStyles();
  const { colors } = useTheme();
  const toast = useToast();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY);

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["dealers"],
    queryFn: () => apiGet<any[]>("/dealers"),
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const body = { ...draft, whatsapp: draft.whatsapp || draft.phone };
      delete (body as any).id;
      return draft.id ? apiPut(`/dealers/${draft.id}`, body) : apiPost("/dealers", body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dealers"] });
      setOpen(false);
      toast.show(draft.id ? "Dealer updated" : "Dealer added", "success");
    },
    onError: (e: any) => toast.show(e?.message || "Failed", "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/dealers/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dealers"] });
      toast.show("Dealer removed", "info");
    },
  });

  function openNew() {
    setDraft(EMPTY);
    setOpen(true);
  }
  function openEdit(d: any) {
    setDraft({ id: d.id, shop_name: d.shop_name, contact_person: d.contact_person || "", phone: d.phone || "", whatsapp: d.whatsapp || "", area: d.area || "", notes: d.notes || "" });
    setOpen(true);
  }
  function call(phone: string) {
    if (!phone) return toast.show("No phone number", "error");
    Linking.openURL(`tel:${phone.replace(/\s/g, "")}`).catch(() => toast.show("Can't open dialer", "error"));
  }
  function whatsapp(num: string) {
    if (!num) return toast.show("No WhatsApp number", "error");
    const clean = num.replace(/\D/g, "");
    const withCc = clean.length === 10 ? `91${clean}` : clean;
    Linking.openURL(`https://wa.me/${withCc}`).catch(() => toast.show("Can't open WhatsApp", "error"));
  }
  function save() {
    if (!draft.shop_name.trim()) return toast.show("Enter shop name", "error");
    saveMutation.mutate();
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
      <ScreenHeader title="Dealer Network" subtitle={`${data?.length || 0} shops`} showBack rightIcon="plus-circle" onRightPress={openNew} rightTestID="dealer-add" />

      {isLoading ? (
        <Loading testID="dealers-loading" />
      ) : isError ? (
        <ErrorState onRetry={refetch} testID="dealers-error" />
      ) : data?.length === 0 ? (
        <EmptyState title="No dealers yet" subtitle="Add your first shop owner." actionLabel="Add Dealer" onAction={openNew} testID="dealers-empty" />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(d) => d.id}
          onRefresh={refetch}
          refreshing={isRefetching}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: insets.bottom + spacing.xl }}
          showsVerticalScrollIndicator={false}
          testID="dealers-list"
          renderItem={({ item }) => (
            <View style={s.card} testID={`dealer-${item.id}`}>
              <View style={s.cardTop}>
                <InitialsAvatar name={item.shop_name} />
                <View style={{ flex: 1 }}>
                  <Text style={s.shop} numberOfLines={1}>
                    {item.shop_name}
                  </Text>
                  {item.contact_person ? <Text style={s.person}>{item.contact_person}</Text> : null}
                  {item.area ? (
                    <Text style={s.area} numberOfLines={2}>
                      {item.area}
                    </Text>
                  ) : null}
                </View>
                <View style={{ gap: spacing.md, alignItems: "center" }}>
                  <Pressable onPress={() => openEdit(item)} hitSlop={8} testID={`dealer-edit-${item.id}`}>
                    <Icon name="pencil" size={18} color={colors.brandPrimary} />
                  </Pressable>
                  <Pressable onPress={() => deleteMutation.mutate(item.id)} hitSlop={8} testID={`dealer-delete-${item.id}`}>
                    <Icon name="trash-can-outline" size={18} color={colors.error} />
                  </Pressable>
                </View>
              </View>
              <View style={s.actions}>
                <Pressable style={s.actionBtn} onPress={() => call(item.phone)} testID={`dealer-call-${item.id}`}>
                  <Icon name="phone" size={16} color={colors.brandPrimary} />
                  <Text style={s.actionText}>Call</Text>
                </Pressable>
                <Pressable style={s.actionBtn} onPress={() => whatsapp(item.whatsapp || item.phone)} testID={`dealer-wa-${item.id}`}>
                  <Icon name="whatsapp" size={16} color={colors.success} />
                  <Text style={[s.actionText, { color: colors.success }]}>WhatsApp</Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      )}

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={s.backdrop}>
          <View style={[s.sheet, { paddingBottom: insets.bottom + spacing.md }]}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>{draft.id ? "Edit Dealer" : "Add Dealer"}</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={10} testID="dealer-form-close">
                <Icon name="close" size={24} color={colors.onSurface} />
              </Pressable>
            </View>
            <KeyboardAwareScrollView contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.md }} bottomOffset={16} keyboardShouldPersistTaps="handled">
              <Field label="Shop Name" value={draft.shop_name} onChangeText={(v) => setDraft({ ...draft, shop_name: v })} placeholder="Shop / electronics name" testID="df-shop" />
              <Field label="Contact Person" value={draft.contact_person} onChangeText={(v) => setDraft({ ...draft, contact_person: v })} placeholder="Owner name" testID="df-person" />
              <Field label="Phone" value={draft.phone} onChangeText={(v) => setDraft({ ...draft, phone: v })} keyboardType="phone-pad" placeholder="10-digit number" testID="df-phone" />
              <Field label="WhatsApp (optional)" value={draft.whatsapp} onChangeText={(v) => setDraft({ ...draft, whatsapp: v })} keyboardType="phone-pad" placeholder="Defaults to phone" testID="df-wa" />
              <Field label="Area / Landmark" value={draft.area} onChangeText={(v) => setDraft({ ...draft, area: v })} placeholder="Address / area" multiline testID="df-area" />
              <Field label="Notes (optional)" value={draft.notes} onChangeText={(v) => setDraft({ ...draft, notes: v })} placeholder="Remarks" testID="df-notes" />
              <Button title={draft.id ? "Save Changes" : "Add Dealer"} onPress={save} loading={saveMutation.isPending} icon="check" testID="df-save" />
            </KeyboardAwareScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: spacing.md },
  cardTop: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
  shop: { color: colors.onSurface, fontSize: 16, fontWeight: "800" },
  person: { color: colors.onSurfaceSecondary, fontSize: 13, marginTop: 2, fontWeight: "600" },
  area: { color: colors.muted, fontSize: 12, marginTop: 3 },
  actions: { flexDirection: "row", gap: spacing.md, borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: spacing.md },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  actionText: { color: colors.brandPrimary, fontSize: 14, fontWeight: "700" },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, maxHeight: "90%" },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
  sheetTitle: { color: colors.onSurface, fontSize: 18, fontWeight: "800" },
}));
