import { AppIcon as Ionicons } from '@/components/ui/app-icon';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { ThemedView } from '../ui/themed-view';

type MyPageSearchFieldProps = {
  placeholder: string;
  value?: string;
  onChangeText?: (text: string) => void;
  onClear?: () => void;
  onSubmitEditing?: () => void;
  style?: StyleProp<ViewStyle>;
};

export function MyPageSearchField({
  placeholder,
  value,
  onChangeText,
  onClear,
  onSubmitEditing,
  style,
}: MyPageSearchFieldProps) {
  const theme = useTheme();
  const canClear = Boolean(value && onClear);

  return (
    <ThemedView type="backgroundElement" style={[styles.container, style]}>
      <View
        style={[styles.iconWrap, { backgroundColor: theme.backgroundSelected }]}>
        <Ionicons name="search-outline" size={17} color={theme.textSecondary} />
      </View>

      <TextInput
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        style={[styles.input, { color: theme.text }]}
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmitEditing}
      />

      {canClear ? (
        <Pressable
          onPress={onClear}
          style={[styles.clearButton, { backgroundColor: theme.backgroundSelected }]}>
          <Ionicons name="close" size={18} color={theme.textSecondary} />
        </Pressable>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 18,
    paddingHorizontal: Spacing.three,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  clearButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
