import { useState } from "react";
import { FlatList, Modal, Pressable, Switch, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "@/src/components/keyboard-scroll";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { apiGet, apiPost, apiPatch } from "@/src/api/client";
import { useAuth } from "@/src/auth/auth-context";
import { Button, ErrorState, Field, InitialsAvatar, Loading, EmptyState } from "@/src/components/ui";
import { Icon } from "@/src/components/icon";
import { ScreenHeader } from "@/src/components/header";
import { useToast } from "@/src/components/toast";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

export default function Staff() {
  const s = useStyles();
  const { colors } = useTheme();
  const toast = useToast();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const isOwner = user?.role === "owner";

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["staff"],
    queryFn: () => apiGet<any[]>("/staff"),
    enabled: isOwner,
  });

  const createMutation = useMutation({
    mutationFn: () => apiPost("/staff", { name: name.trim(), email: email.trim().toLowerCase(), password }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff"] });
      setOpen(false);
      setName("");
      setEmail("");
      setPassword("");
      toast.show("Staff account created", "success");
    },
    onError: (e: any) => toast.show(e?.message || "Failed", "error"),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => apiPatch(`/staff/${id}`, { active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff"] }),
    onError: (e: any) => toast.show(e?.message || "Failed", "error"),
  });

  function save() {
    if (!name.trim()) return toast.show("Enter name", "error");
    if (!email.trim()) return toast.show("Enter email", "error");
    if (password.length < 6) return toast.show("Password min 6 characters", "error");
    createMutation.mutate();
  }

  if (!isOwner) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
        <ScreenHeader title="Staff" showBack />
        <EmptyState title="Owner only" subtitle="Only the owner can manage staff." actionLabel="Go Back" onAction={() => router.back()} testID="staff-forbidden" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceSecondary }}>
      <ScreenHeader title="Staff" subtitle="Manage team access" showBack rightIcon="account-plus" onRightPress={() => setOpen(true)} rightTestID="staff-add" />

      {isLoading ? (
        <Loading testID="staff-loading" />
      ) : isError ? (
        <ErrorState onRetry={refetch} testID="staff-error" />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(u) => u.id}
          onRefresh={refetch}
          refreshing={isRefetching}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: insets.bottom + spacing.xl }}
          showsVerticalScrollIndicator={false}
          testID="staff-list"
          ListEmptyComponent={<EmptyState title="No staff yet" subtitle="Add team members to give them access." actionLabel="Add Staff" onAction={() => setOpen(true)} testID="staff-empty" />}
          renderItem={({ item }) => (
            <View style={s.row} testID={`staff-${item.id}`}>
              <InitialsAvatar name={item.name} />
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{item.name}</Text>
                <Text style={s.email}>{item.email}</Text>
              </View>
              <View style={{ alignItems: "flex-end", gap: 2 }}>
                <Switch
                  value={item.active}
                  onValueChange={(v) => toggleMutation.mutate({ id: item.id, active: v })}
                  trackColor={{ true: colors.brandPrimary, false: colors.borderStrong }}
                  testID={`staff-toggle-${item.id}`}
                />
                <Text style={[s.status, { color: item.active ? colors.success : colors.muted }]}>{item.active ? "Active" : "Disabled"}</Text>
              </View>
            </View>
          )}
        />
      )}

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={s.backdrop}>
          <View style={[s.sheet, { paddingBottom: insets.bottom + spacing.md }]}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>Add Staff</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={10} testID="staff-form-close">
                <Icon name="close" size={24} color={colors.onSurface} />
              </Pressable>
            </View>
            <KeyboardAwareScrollView contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.md }} bottomOffset={16} keyboardShouldPersistTaps="handled">
              <Field label="Name" value={name} onChangeText={setName} placeholder="Full name" testID="sf-name" />
              <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="staff@business.com" testID="sf-email" />
              <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="Min 6 characters" testID="sf-password" />
              <Button title="Create Account" onPress={save} loading={createMutation.isPending} icon="account-check" testID="sf-save" />
            </KeyboardAwareScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg },
  name: { color: colors.onSurface, fontSize: 15, fontWeight: "700" },
  email: { color: colors.muted, fontSize: 13, marginTop: 2 },
  status: { fontSize: 11, fontWeight: "700" },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, maxHeight: "88%" },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
  sheetTitle: { color: colors.onSurface, fontSize: 18, fontWeight: "800" },
}));
