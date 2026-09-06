import { useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Icon } from "@/src/components/icon";
import { formatDate } from "@/src/lib/format";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

export function DateField({
  label = "Date",
  value,
  onChange,
  testID,
}: {
  label?: string;
  value: Date;
  onChange: (d: Date) => void;
  testID?: string;
}) {
  const s = useStyles();
  const { colors } = useTheme();
  const [show, setShow] = useState(false);

  return (
    <View style={{ gap: 6 }}>
      <Text style={s.label}>{label}</Text>
      <Pressable style={s.btn} onPress={() => setShow(true)} testID={testID}>
        <Icon name="calendar" size={18} color={colors.brandPrimary} />
        <Text style={s.text}>{formatDate(value.toISOString())}</Text>
        <Icon name="chevron-down" size={18} color={colors.muted} />
      </Pressable>
      {show ? (
        <DateTimePicker
          value={value}
          mode="date"
          maximumDate={new Date()}
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(_e, d) => {
            setShow(Platform.OS === "ios");
            if (d) onChange(d);
          }}
          testID={`${testID}-picker`}
        />
      ) : null}
      {Platform.OS === "ios" && show ? (
        <Pressable onPress={() => setShow(false)} style={s.done} testID={`${testID}-done`}>
          <Text style={s.doneText}>Done</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  label: { color: colors.onSurfaceSecondary, fontSize: 13, fontWeight: "600" },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  text: { color: colors.onSurface, fontSize: 15, fontWeight: "600", flex: 1 },
  done: { alignSelf: "flex-end", paddingVertical: 6, paddingHorizontal: 12 },
  doneText: { color: colors.brandPrimary, fontSize: 14, fontWeight: "700" },
}));
