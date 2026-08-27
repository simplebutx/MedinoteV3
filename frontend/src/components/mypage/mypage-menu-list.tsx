import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/ui/themed-text";
import { ThemedView } from "@/components/ui/themed-view";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

const menuItems = [
  { key: "basic-health", title: "내 기본 건강정보" },
  { key: "disease", title: "내 기저 질환" },
  { key: "warning", title: "내 주의 약/성분" },
  { key: "account-info", title: "회원정보" },
  { key: "settings", title: "계정 및 설정" },
] as const;

type MyPageMenuKey = (typeof menuItems)[number]["key"];

type MyPageMenuListProps = {
  itemKeys?: MyPageMenuKey[];
};

export function MyPageMenuList({ itemKeys }: MyPageMenuListProps) {
  const theme = useTheme();
  const router = useRouter();
  const visibleItems = itemKeys
    ? menuItems.filter((item) => itemKeys.includes(item.key))
    : menuItems;

  return (
    <ThemedView type="backgroundElement" style={styles.container}>
      {visibleItems.map((item, index) => (
        <Pressable
          key={item.key}
          style={styles.item}
          onPress={() => {
            if (item.key === "basic-health") {
              router.push("/basic-health");
            }
            if (item.key === "disease") {
              router.push("/disease");
            }
            if (item.key === "warning") {
              router.push("/warning");
            }
            if (item.key === "account-info") {
              router.push("/account-info");
            }
            if (item.key === "settings") {
              router.push("/settings");
            }
          }}
        >
          <ThemedText style={styles.title}>{item.title}</ThemedText>

          <ThemedText themeColor="textSecondary" style={styles.chevron}>
            &gt;
          </ThemedText>

          {index < visibleItems.length - 1 && (
            <View
              style={[
                styles.divider,
                { backgroundColor: theme.backgroundSelected },
              ]}
            />
          )}
        </Pressable>
      ))}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 18,
    overflow: "hidden",
  },
  item: {
    minHeight: 56,
    paddingHorizontal: Spacing.three,
    paddingVertical: 14,
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.two,
  },
  title: {
    fontSize: 17,
    lineHeight: 22,
  },
  chevron: {
    fontSize: 18,
    lineHeight: 18,
  },
  divider: {
    position: "absolute",
    left: Spacing.three,
    right: 0,
    bottom: 0,
    height: 1,
  },
});
