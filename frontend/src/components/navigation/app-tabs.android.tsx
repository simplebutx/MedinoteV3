import { Ionicons } from '@expo/vector-icons';
import {
  TabList,
  TabListProps,
  Tabs,
  TabSlot,
  TabTrigger,
  TabTriggerSlotProps,
} from 'expo-router/ui';
import { Pressable, StyleSheet, useColorScheme, View } from 'react-native';

import { Colors, MaxContentWidth, Spacing } from '@/constants/theme';

import { ThemedText } from '../ui/themed-text';
import { ThemedView } from '../ui/themed-view';

const tabs = [
  {
    name: 'index',
    href: './',
    label: '복약 일정',
    icon: 'calendar-outline',
    selectedIcon: 'calendar',
  },
  {
    name: 'search',
    href: './search',
    label: '약 검색',
    icon: 'search-outline',
    selectedIcon: 'search',
  },
  {
    name: 'add',
    href: './add',
    label: '업로드',
    icon: 'camera-outline',
    selectedIcon: 'camera',
  },
  {
    name: 'prescription',
    href: './prescription',
    label: '처방전',
    icon: 'document-text-outline',
    selectedIcon: 'document-text',
  },
  {
    name: 'mypage',
    href: './mypage',
    label: '마이',
    icon: 'person-outline',
    selectedIcon: 'person',
  },
] as const;

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
          {tabs.map((tab) => (
            <TabTrigger key={tab.name} name={tab.name} href={tab.href} asChild>
              <TabButton
                icon={tab.icon}
                label={tab.label}
                selectedIcon={tab.selectedIcon}
              />
            </TabTrigger>
          ))}
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

type TabButtonProps = TabTriggerSlotProps & {
  icon: keyof typeof Ionicons.glyphMap;
  selectedIcon: keyof typeof Ionicons.glyphMap;
  label: string;
};

function TabButton({
  icon,
  selectedIcon,
  label,
  isFocused,
  ...props
}: TabButtonProps) {
  return (
    <Pressable {...props} style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}>
      <View style={styles.tabButtonView}>
        <Ionicons
          color={isFocused ? '#0ea5e9' : '#8b9098'}
          name={isFocused ? selectedIcon : icon}
          size={23}
        />
        <ThemedText
          type="small"
          themeColor={isFocused ? 'text' : 'textSecondary'}
          style={styles.label}>
          {label}
        </ThemedText>
      </View>
    </Pressable>
  );
}

function CustomTabList(props: TabListProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme ?? 'light'];

  return (
    <View {...props} style={styles.tabListContainer}>
      <ThemedView
        type="backgroundElement"
        style={[
          styles.innerContainer,
          {
            borderColor: colors.backgroundSelected,
            backgroundColor: colors.backgroundElement,
          },
        ]}>
        {props.children}
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: '100%',
    padding: Spacing.three,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  innerContainer: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexGrow: 1,
    gap: Spacing.one,
    maxWidth: MaxContentWidth,
    borderWidth: 1,
  },
  pressable: {
    flex: 1,
  },
  pressed: {
    opacity: 0.7,
  },
  tabButtonView: {
    minWidth: 62,
    alignItems: 'center',
    gap: 3,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: 18,
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
  },
});
