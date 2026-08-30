import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  fetchMedicineSuggestions,
  type MedicineSuggestion,
} from '@/services/medicine-api';

import { ThemedText } from '../ui/themed-text';
import { ThemedView } from '../ui/themed-view';

type SearchBarProps = {
  onSearch?: (medicine: MedicineSuggestion) => void;
  onClear?: () => void;
};

export function SearchBar({ onSearch, onClear }: SearchBarProps) {
  const theme = useTheme();
  const [keyword, setKeyword] = useState('');
  const [suggestions, setSuggestions] = useState<MedicineSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [hideSuggestions, setHideSuggestions] = useState(false);

  useEffect(() => {
    const trimmedKeyword = keyword.trim();

    if (!trimmedKeyword) {
      setSuggestions([]);
      setErrorMessage('');
      setIsLoading(false);
      setHideSuggestions(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const nextSuggestions = await fetchMedicineSuggestions(trimmedKeyword);
        setSuggestions(nextSuggestions);
      } catch (error) {
        setSuggestions([]);
        setErrorMessage(
          error instanceof Error && error.message
            ? error.message
            : 'Failed to load suggestions.'
        );
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [keyword]);

  const handleSearch = (medicine: MedicineSuggestion) => {
    setKeyword(medicine.itemName);
    setSuggestions([]);
    setHideSuggestions(true);
    onSearch?.(medicine);
  };

  const handleClear = () => {
    setKeyword('');
    setSuggestions([]);
    setErrorMessage('');
    setHideSuggestions(false);
    setIsLoading(false);
    onClear?.();
  };

  const handleSubmit = () => {
    const exactSuggestion = suggestions.find(
      (suggestion) => suggestion.itemName === keyword.trim(),
    );

    if (exactSuggestion) {
      handleSearch(exactSuggestion);
    }
  };

  return (
    <View style={styles.wrap}>
      <ThemedView type="backgroundElement" style={styles.container}>
        <View
          style={[styles.iconWrap, { backgroundColor: theme.backgroundSelected }]}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            Q
          </ThemedText>
        </View>

        <TextInput
          placeholder="Search medicine"
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { color: theme.text }]}
          value={keyword}
          onChangeText={(text) => {
            setKeyword(text);
            setHideSuggestions(false);
          }}
          onSubmitEditing={handleSubmit}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />

        {isLoading ? (
          <ActivityIndicator size="small" color={theme.textSecondary} />
        ) : null}

        {keyword ? (
          <Pressable
            onPress={handleClear}
            style={[styles.clearButton, { backgroundColor: theme.backgroundSelected }]}>
            <Ionicons name="close" size={18} color={theme.textSecondary} />
          </Pressable>
        ) : null}
      </ThemedView>

      {errorMessage ? (
        <ThemedText themeColor="textSecondary" style={styles.feedbackText}>
          {errorMessage}
        </ThemedText>
      ) : null}

      {!hideSuggestions && suggestions.length > 0 ? (
        <ThemedView type="backgroundElement" style={styles.suggestionCard}>
          {suggestions.map((suggestion) => (
            <Pressable
              key={suggestion.itemSeq}
              onPress={() => handleSearch(suggestion)}
              style={styles.suggestionButton}>
              <ThemedText style={styles.suggestionLabel}>
                {suggestion.itemName}
              </ThemedText>
            </Pressable>
          ))}
        </ThemedView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.two,
  },
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
  feedbackText: {
    fontSize: 13,
    lineHeight: 18,
  },
  suggestionCard: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  suggestionButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: 14,
  },
  suggestionLabel: {
    fontSize: 15,
    lineHeight: 20,
  },
});
