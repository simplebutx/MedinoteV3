import {
  TabList,
  TabListProps,
  Tabs,
  TabSlot,
  TabTrigger,
  TabTriggerSlotProps,
} from "expo-router/ui";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "../ui/themed-text";
import { ThemedView } from "../ui/themed-view";

import { MaxContentWidth, Spacing } from "@/constants/theme";

const tabs = [
  { name: "calendar", href: "./", label: "달력", badge: "달" },
  { name: "search", href: "./search", label: "검색", badge: "검" },
  { name: "add", href: "./add", label: "+", badge: "+" },
  { name: "prescription", href: "./prescription", label: "처방전", badge: "처" },
  { name: "mypage", href: "./mypage", label: "마이페이지", badge: "마" },
] as const;

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: "100%" }} />
      <TabList asChild>
        <CustomTabList>
          {tabs.map((tab) => (
            <TabTrigger key={tab.name} name={tab.name} href={tab.href} asChild>
              <TabButton badge={tab.badge}>{tab.label}</TabButton>
            </TabTrigger>
          ))}
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

type TabButtonProps = TabTriggerSlotProps & {
  badge: string;
};

export function TabButton({
  children,
  badge,
  isFocused,
  ...props
}: TabButtonProps) {
  return (
    <Pressable {...props} style={({ pressed }) => pressed && styles.pressed}>
      <View style={styles.tabButtonView}>
        <View style={styles.badgeWrap}>
          <ThemedText
            type="smallBold"
            themeColor={isFocused ? "text" : "textSecondary"}
          >
            {badge}
          </ThemedText>
        </View>
        <ThemedText
          type="small"
          themeColor={isFocused ? "text" : "textSecondary"}
        >
          {children}
        </ThemedText>
      </View>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  return (
    <View {...props} style={styles.tabListContainer}>
      <ThemedView
        type="backgroundElement"
        style={[
          styles.innerContainer,
          { borderColor: '#2E3135', backgroundColor: '#212225' },
        ]}
      >
        {props.children}
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    position: "absolute",
    width: "100%",
    padding: Spacing.three,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },
  innerContainer: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: 30,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexGrow: 1,
    gap: Spacing.one,
    maxWidth: MaxContentWidth,
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.7,
  },
  tabButtonView: {
    minWidth: 62,
    alignItems: "center",
    gap: 2,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: 18,
  },
  badgeWrap: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
});
