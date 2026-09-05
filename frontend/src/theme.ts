// Design tokens for Soneja CRM. Light + dark, blue/teal professional theme.
// Keys match the "color" block of /app/design_guidelines.json.

import { useMemo } from "react";
import { Appearance, StyleSheet, useColorScheme } from "react-native";

export type ColorScheme = "light" | "dark";

const light = {
  surface: "#FFFFFF",
  onSurface: "#111827",
  surfaceSecondary: "#F9FAFB",
  onSurfaceSecondary: "#374151",
  surfaceTertiary: "#F3F4F6",
  onSurfaceTertiary: "#4B5563",
  surfaceInverse: "#1F2937",
  onSurfaceInverse: "#F9FAFB",
  muted: "#6B7280",

  brand: "#0F4C5C",
  onBrand: "#FFFFFF",
  brandPrimary: "#0F4C5C",
  onBrandPrimary: "#FFFFFF",
  brandSecondary: "#156175",
  onBrandSecondary: "#FFFFFF",
  brandTertiary: "#E0F2F1",
  onBrandTertiary: "#0F4C5C",

  success: "#059669",
  onSuccess: "#FFFFFF",
  warning: "#D97706",
  onWarning: "#FFFFFF",
  error: "#DC2626",
  onError: "#FFFFFF",
  info: "#2563EB",
  onInfo: "#FFFFFF",

  border: "#E5E7EB",
  borderStrong: "#D1D5DB",
  divider: "#F3F4F6",
};

const dark: typeof light = {
  surface: "#111827",
  onSurface: "#F9FAFB",
  surfaceSecondary: "#1F2937",
  onSurfaceSecondary: "#E5E7EB",
  surfaceTertiary: "#374151",
  onSurfaceTertiary: "#D1D5DB",
  surfaceInverse: "#F9FAFB",
  onSurfaceInverse: "#111827",
  muted: "#9CA3AF",

  brand: "#4E8D9C",
  onBrand: "#111827",
  brandPrimary: "#4E8D9C",
  onBrandPrimary: "#111827",
  brandSecondary: "#68A5B3",
  onBrandSecondary: "#111827",
  brandTertiary: "#1C3D45",
  onBrandTertiary: "#86C7D7",

  success: "#10B981",
  onSuccess: "#111827",
  warning: "#F59E0B",
  onWarning: "#111827",
  error: "#EF4444",
  onError: "#111827",
  info: "#3B82F6",
  onInfo: "#111827",

  border: "#374151",
  borderStrong: "#4B5563",
  divider: "#1F2937",
};

export type ThemeColors = typeof light;

export const defaultScheme = "light" satisfies ColorScheme;

export const themes: { light: ThemeColors; dark?: ThemeColors } = { light, dark };

export function setColorScheme(scheme: ColorScheme | null) {
  Appearance.setColorScheme?.(scheme);
}

setColorScheme?.(themes.dark ? null : defaultScheme);

export function useTheme(): { scheme: ColorScheme; colors: ThemeColors } {
  const system = useColorScheme();
  const scheme: ColorScheme = system && themes[system] ? system : defaultScheme;
  return { scheme, colors: themes[scheme] ?? themes.light };
}

export function makeStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (colors: ThemeColors) => T & StyleSheet.NamedStyles<any>,
): () => T {
  return function useStyles(): T {
    const { colors } = useTheme();
    return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
  };
}

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, "2xl": 32, "3xl": 48 };
export const radius = { sm: 6, md: 12, lg: 20, pill: 999 };
