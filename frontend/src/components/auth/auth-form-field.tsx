import { StyleSheet, TextInput, TextInputProps, View } from 'react-native';

import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type AuthFormFieldProps = TextInputProps & {
  label: string;
};

export function AuthFormField({ label, style, ...props }: AuthFormFieldProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <ThemedText themeColor="textSecondary" style={styles.label}>
        {label}
      </ThemedText>
      <ThemedView type="background" style={styles.inputWrap}>
        <TextInput
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { color: theme.text }, style]}
          {...props}
        />
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  label: {
    fontSize: 14,
    lineHeight: 18,
  },
  inputWrap: {
    borderRadius: 16,
    paddingHorizontal: Spacing.three,
    paddingVertical: 14,
  },
  input: {
    fontSize: 16,
    paddingVertical: 0,
  },
});
