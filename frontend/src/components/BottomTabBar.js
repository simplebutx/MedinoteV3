import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { TABS } from "../constants/tabs";
import { styles } from "../styles/sharedStyles";

export function BottomTabBar({ activeTab, onChangeTab }) {
  return (
    <View style={styles.bottomNav}>
      {TABS.map((tab) => {
        const isActive = activeTab === tab.key;

        return (
          <Pressable
            key={tab.key}
            onPress={() => onChangeTab(tab.key)}
            style={({ pressed }) => [
              styles.tabButton,
              isActive && styles.activeTabButton,
              pressed && styles.pressedTab,
            ]}
          >
            <Ionicons
              name={tab.icon}
              size={tab.key === "ocr" ? 30 : 24}
              color={isActive ? "#176b87" : "#7a878e"}
            />
            <Text style={[styles.tabLabel, isActive && styles.activeTabLabel]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
