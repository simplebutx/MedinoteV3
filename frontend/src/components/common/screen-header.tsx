import { StyleSheet, View } from "react-native";

import { TopAlertBanner } from "@/components/navigation/top-alert-banner";
import { ThemedText } from "@/components/ui/themed-text";
import { Spacing } from "@/constants/theme";

type ScreenHeaderProps = {
  eyebrow: string;
  title: string;
  showAlert?: boolean;
};

export function ScreenHeader({ eyebrow, title, showAlert = true }: ScreenHeaderProps) {
  return (
    <View style={styles.headerRow}>
      <View style={styles.header}>
        <ThemedText type="small" themeColor="textSecondary">
          {eyebrow}
        </ThemedText>
        <ThemedText type="subtitle">{title}</ThemedText>
      </View>
      {showAlert ? <TopAlertBanner unreadCount={3} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.two,
  },
  header: {
    flex: 1,
    gap: Spacing.one,
  },
});
