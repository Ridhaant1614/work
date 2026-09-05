import { Platform } from "react-native";
import { Tabs } from "expo-router";
import { useTheme } from "@/src/theme";
import { Icon, IconName } from "@/src/components/icon";

const isIOS26 =
  Platform.OS === "ios" && parseInt(String(Platform.Version), 10) >= 26;

function ClassicTabs() {
  const { colors } = useTheme();
  const tab = (name: string, title: string, icon: IconName) => (
    <Tabs.Screen
      key={name}
      name={name}
      options={{
        title,
        tabBarIcon: ({ color, focused }) => (
          <Icon name={icon} size={focused ? 26 : 24} color={color} />
        ),
      }}
    />
  );
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brandPrimary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          ...(Platform.OS === "web" ? { height: 64 } : {}),
        },
        tabBarItemStyle: { alignSelf: "center" },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      {tab("index", "Home", "view-dashboard")}
      {tab("sales", "Sales", "cart-arrow-up")}
      {tab("purchases", "Purchases", "truck-delivery")}
      {tab("more", "More", "dots-horizontal-circle")}
    </Tabs>
  );
}

export default function TabsLayout() {
  // iOS 26+ gets native liquid-glass tabs; everything else uses classic tabs.
  if (isIOS26) {
    const {
      NativeTabs,
      Icon: NativeIcon,
      Label,
      // eslint-disable-next-line @typescript-eslint/no-require-imports
    } = require("expo-router/unstable-native-tabs");
    return (
      <NativeTabs>
        <NativeTabs.Trigger name="index">
          <Label>Home</Label>
          <NativeIcon sf="square.grid.2x2.fill" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="sales">
          <Label>Sales</Label>
          <NativeIcon sf="cart.fill" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="purchases">
          <Label>Purchases</Label>
          <NativeIcon sf="shippingbox.fill" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="more">
          <Label>More</Label>
          <NativeIcon sf="ellipsis.circle.fill" />
        </NativeTabs.Trigger>
      </NativeTabs>
    );
  }
  return <ClassicTabs />;
}
