import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { Animated, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { radius, useTheme } from "@/src/theme";
import { Icon, IconName } from "@/src/components/icon";

type ToastType = "success" | "error" | "info";
type ToastCtx = { show: (msg: string, type?: ToastType) => void };

const Ctx = createContext<ToastCtx>({ show: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [msg, setMsg] = useState("");
  const [type, setType] = useState<ToastType>("info");
  const [visible, setVisible] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const translate = useRef(new Animated.Value(-20)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(
    (m: string, t: ToastType = "info") => {
      setMsg(m);
      setType(t);
      setVisible(true);
      if (t === "success") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      if (t === "error") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(translate, { toValue: 0, useNativeDriver: true }),
      ]).start();
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
          Animated.timing(translate, { toValue: -20, duration: 200, useNativeDriver: true }),
        ]).start(() => setVisible(false));
      }, 2600);
    },
    [opacity, translate],
  );

  const bg = type === "success" ? colors.success : type === "error" ? colors.error : colors.surfaceInverse;
  const fg = type === "success" ? colors.onSuccess : type === "error" ? colors.onError : colors.onSurfaceInverse;
  const iconName: IconName = type === "success" ? "check-circle" : type === "error" ? "alert-circle" : "information";

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      {visible ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: insets.top + 8,
            left: 16,
            right: 16,
            opacity,
            transform: [{ translateY: translate }],
            zIndex: 9999,
          }}
        >
          <View
            style={{
              backgroundColor: bg,
              borderRadius: radius.md,
              paddingVertical: 12,
              paddingHorizontal: 16,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              shadowColor: "#000",
              shadowOpacity: 0.2,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 4 },
              elevation: 6,
            }}
          >
            <Icon name={iconName} size={20} color={fg} />
            <Text style={{ color: fg, fontSize: 14, fontWeight: "600", flex: 1 }}>{msg}</Text>
          </View>
        </Animated.View>
      ) : null}
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
