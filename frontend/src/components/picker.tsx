import { useState, useMemo } from "react";
import { FlatList, Modal, Pressable, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/src/components/icon";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

export type Option = { label: string; value: string; sublabel?: string };

export function SelectField({
  label,
  placeholder,
  value,
  options,
  onSelect,
  testID,
}: {
  label?: string;
  placeholder: string;
  value: string | null;
  options: Option[];
  onSelect: (opt: Option) => void;
  testID?: string;
}) {
  const s = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = options.find((o) => o.value === value);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || (o.sublabel || "").toLowerCase().includes(q),
    );
  }, [options, query]);

  return (
    <View style={{ gap: 6 }}>
      {label ? <Text style={s.label}>{label}</Text> : null}
      <Pressable style={s.trigger} onPress={() => setOpen(true)} testID={testID}>
        <Text style={[s.triggerText, !selected && { color: colors.muted }]} numberOfLines={1}>
          {selected ? selected.label : placeholder}
        </Text>
        <Icon name="chevron-down" size={20} color={colors.muted} />
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={s.backdrop}>
          <View style={[s.sheet, { paddingBottom: insets.bottom + spacing.md, paddingTop: spacing.md }]}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>{placeholder}</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={10} testID="picker-close">
                <Icon name="close" size={24} color={colors.onSurface} />
              </Pressable>
            </View>
            <View style={s.searchBox}>
              <Icon name="magnify" size={20} color={colors.muted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search..."
                placeholderTextColor={colors.muted}
                style={s.searchInput}
                testID="picker-search"
              />
            </View>
            <FlatList
              data={filtered}
              keyExtractor={(o) => o.value}
              keyboardShouldPersistTaps="handled"
              style={{ maxHeight: 380 }}
              renderItem={({ item }) => (
                <Pressable
                  style={s.option}
                  onPress={() => {
                    onSelect(item);
                    setOpen(false);
                    setQuery("");
                  }}
                  testID={`option-${item.value}`}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={s.optLabel}>{item.label}</Text>
                    {item.sublabel ? <Text style={s.optSub}>{item.sublabel}</Text> : null}
                  </View>
                  {item.value === value ? <Icon name="check" size={20} color={colors.brandPrimary} /> : null}
                </Pressable>
              )}
              ListEmptyComponent={<Text style={s.empty}>No matches</Text>}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  label: { color: colors.onSurfaceSecondary, fontSize: 13, fontWeight: "600" },
  trigger: {
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  triggerText: { color: colors.onSurface, fontSize: 15, flex: 1 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: spacing.lg,
  },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
  sheetTitle: { color: colors.onSurface, fontSize: 18, fontWeight: "800" },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    marginBottom: spacing.sm,
  },
  searchInput: { flex: 1, color: colors.onSurface, fontSize: 15, paddingVertical: 12 },
  option: { flexDirection: "row", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.divider },
  optLabel: { color: colors.onSurface, fontSize: 15, fontWeight: "600" },
  optSub: { color: colors.muted, fontSize: 12, marginTop: 2 },
  empty: { color: colors.muted, textAlign: "center", padding: spacing.xl },
}));
