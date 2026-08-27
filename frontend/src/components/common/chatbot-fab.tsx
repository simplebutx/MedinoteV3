import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";

import { Spacing } from "@/constants/theme";
import { ThemedText } from "../ui/themed-text";

type ChatbotFabProps = {
  onPress?: () => void;
};

export function ChatbotFab({ onPress }: ChatbotFabProps) {
  return (
    <Pressable hitSlop={12} style={styles.button} onPress={onPress}>
      <View style={styles.iconWrap}>
        <Ionicons name="chatbubble-ellipses" size={18} color="#FFFFFF" />
      </View>
      <ThemedText style={styles.label}>AI 챗봇</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: "absolute",
    right: Spacing.three,
    bottom: 94,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 107, 129, 0.82)",
    paddingLeft: 8,
    paddingRight: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#000000",
    shadowOpacity: 0.14,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 24,
    zIndex: 40,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    color: "#FFFFFF",
    fontSize: 13,
    lineHeight: 16,
    fontWeight: "700",
  },
});
