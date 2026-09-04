import { AppIcon as Ionicons } from '@/components/ui/app-icon';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  createMyDisease,
  deleteMyDisease,
  fetchDiseaseSuggestions,
  fetchMyDiseases,
  type DiseaseResponse,
  type DiseaseSuggestResponse,
} from '@/services/disease-api';

import { MyPageSearchField } from './mypage-search-field';
import { ThemedText } from '../ui/themed-text';
import { ThemedView } from '../ui/themed-view';

export function DiseaseListSection() {
  const theme = useTheme();
  const [keyword, setKeyword] = useState('');
  const [suggestions, setSuggestions] = useState<DiseaseSuggestResponse[]>([]);
  const [diseases, setDiseases] = useState<DiseaseResponse[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');

  useEffect(() => {
    const loadDiseases = async () => {
      try {
        const nextDiseases = await fetchMyDiseases();
        setDiseases(nextDiseases);
      } catch (error) {
        setFeedbackMessage(
          error instanceof Error && error.message
            ? error.message
            : '기저질환 목록을 불러오지 못했어요.'
        );
      } finally {
        setIsLoadingList(false);
      }
    };

    void loadDiseases();
  }, []);

  useEffect(() => {
    const trimmedKeyword = keyword.trim();

    if (!trimmedKeyword) {
      setSuggestions([]);
      setIsLoadingSuggestions(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsLoadingSuggestions(true);

      try {
        const nextSuggestions = await fetchDiseaseSuggestions(trimmedKeyword);
        setSuggestions(nextSuggestions);
      } catch (error) {
        setSuggestions([]);
        setFeedbackMessage(
          error instanceof Error && error.message
            ? error.message
            : '기저질환 자동완성 결과를 불러오지 못했어요.'
        );
      } finally {
        setIsLoadingSuggestions(false);
      }
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [keyword]);

  const trimmedKeyword = keyword.trim();
  const hasExactSuggestion = suggestions.some(
    (item) => item.diseaseName.trim() === trimmedKeyword
  );
  const isSearchGroupOpen =
    isLoadingSuggestions ||
    suggestions.length > 0 ||
    Boolean(trimmedKeyword && !hasExactSuggestion);

  const clearKeyword = () => {
    setKeyword('');
    setSuggestions([]);
  };

  const handleCreate = async (disease: DiseaseSuggestResponse) => {
    try {
      const createdDisease = await createMyDisease(disease);
      setDiseases((prev) => [createdDisease, ...prev]);
      setKeyword('');
      setSuggestions([]);
      setFeedbackMessage('');

      const refreshedDiseases = await fetchMyDiseases();
      setDiseases(refreshedDiseases);
    } catch (error) {
      setFeedbackMessage(
        error instanceof Error && error.message
          ? error.message
          : '기저질환을 등록하지 못했어요.'
      );
      }
  };

  const handleCreateCustom = async () => {
    if (!trimmedKeyword) {
      return;
    }

    await handleCreate({
      diseaseCode: '',
      diseaseName: trimmedKeyword,
    });
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteMyDisease(id);
      setDiseases((prev) => prev.filter((item) => item.id !== id));
      setFeedbackMessage('');
    } catch (error) {
      setFeedbackMessage(
        error instanceof Error && error.message
          ? error.message
          : '기저질환을 삭제하지 못했어요.'
      );
    }
  };

  return (
    <View style={styles.container}>
      <MyPageSearchField
        placeholder="질환명을 검색해보세요"
        value={keyword}
        onChangeText={setKeyword}
        onClear={clearKeyword}
        style={isSearchGroupOpen ? styles.connectedSearchField : undefined}
      />

      {isLoadingSuggestions ? (
        <ThemedView
          type="backgroundElement"
          style={[styles.feedbackCard, styles.connectedSuggestionList]}>
          <ActivityIndicator />
          <ThemedText themeColor="textSecondary">
            자동완성 결과를 불러오는 중이에요.
          </ThemedText>
        </ThemedView>
      ) : null}

      {suggestions.length > 0 ? (
        <ThemedView
          type="backgroundElement"
          style={[styles.listCard, styles.connectedSuggestionList]}>
          {suggestions.map((item, index) => (
            <Pressable
              key={`${item.diseaseCode}-${item.diseaseName}`}
              onPress={() => {
                void handleCreate(item);
              }}
              style={styles.row}>
              <View style={styles.rowHeader}>
                <ThemedText style={styles.itemTitle}>{item.diseaseName}</ThemedText>
              </View>

              {index < suggestions.length - 1 && (
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
      ) : null}

      {trimmedKeyword && !isLoadingSuggestions && !hasExactSuggestion ? (
        <ThemedView
          type="backgroundElement"
          style={[styles.listCard, styles.connectedSuggestionList]}>
          <Pressable
            onPress={() => {
              void handleCreateCustom();
            }}
            style={styles.row}>
            <View style={styles.rowHeader}>
              <View style={styles.customCopy}>
                <ThemedText style={styles.itemTitle}>{trimmedKeyword}</ThemedText>
                <ThemedText themeColor="textSecondary" style={styles.customNote}>
                  자동완성에 없으면 이 항목을 직접 등록할 수 있어요.
                </ThemedText>
              </View>
            </View>
          </Pressable>
        </ThemedView>
      ) : null}

      <View style={styles.sectionHeader}>
        <ThemedText style={styles.sectionTitle}>내 기저질환</ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.sectionCount}>
          {diseases.length}개
        </ThemedText>
      </View>

      {feedbackMessage ? (
        <ThemedText themeColor="textSecondary" style={styles.feedbackText}>
          {feedbackMessage}
        </ThemedText>
      ) : null}

      {isLoadingList ? (
        <ThemedView type="backgroundElement" style={styles.feedbackCard}>
          <ActivityIndicator />
          <ThemedText themeColor="textSecondary">
            기저질환 목록을 불러오는 중이에요.
          </ThemedText>
        </ThemedView>
      ) : diseases.length > 0 ? (
        <ThemedView type="backgroundElement" style={styles.listCard}>
          {diseases.map((item, index) => (
            <View key={item.id} style={styles.row}>
              <View style={styles.rowHeader}>
                <ThemedText style={styles.itemTitle}>{item.diseaseName}</ThemedText>
                <Pressable
                  onPress={() => {
                    void handleDelete(item.id);
                  }}
                  style={[
                    styles.iconButton,
                    { backgroundColor: theme.backgroundSelected },
                  ]}>
                  <Ionicons name="close" size={18} color={theme.textSecondary} />
                </Pressable>
              </View>

              {index < diseases.length - 1 && (
                <View
                  style={[
                    styles.divider,
                    { backgroundColor: theme.backgroundSelected },
                  ]}
                />
              )}
            </View>
          ))}
        </ThemedView>
      ) : (
        <ThemedView type="backgroundElement" style={styles.emptyCard}>
          <ThemedText themeColor="textSecondary">
            등록된 기저질환이 없어요.
          </ThemedText>
        </ThemedView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.four,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '700',
  },
  sectionCount: {
    fontSize: 14,
    lineHeight: 18,
  },
  listCard: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  emptyCard: {
    borderRadius: 18,
    padding: Spacing.three,
  },
  feedbackCard: {
    borderRadius: 18,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  feedbackText: {
    fontSize: 13,
    lineHeight: 18,
  },
  connectedSearchField: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  connectedSuggestionList: {
    marginTop: -Spacing.four,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  row: {
    minHeight: 56,
    paddingHorizontal: Spacing.three,
    justifyContent: 'center',
    position: 'relative',
    paddingVertical: 14,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  itemTitle: {
    flex: 1,
    fontSize: 17,
    lineHeight: 22,
  },
  customCopy: {
    flex: 1,
    gap: 4,
  },
  customNote: {
    fontSize: 13,
    lineHeight: 18,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    position: 'absolute',
    left: Spacing.three,
    right: 0,
    bottom: 0,
    height: 1,
  },
});
