import React from "react";
import MaterialDesignIcons from "@react-native-vector-icons/material-design-icons";
import { useTheme } from "@/src/theme";

type IconName = React.ComponentProps<typeof MaterialDesignIcons>["name"];

export function Icon({
  name,
  size = 22,
  color,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  const { colors } = useTheme();
  return <MaterialDesignIcons name={name} size={size} color={color ?? colors.onSurface} />;
}

export type { IconName };
