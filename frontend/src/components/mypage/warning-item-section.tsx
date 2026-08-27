import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  createMyCaution,
  deleteMyCaution,
  fetchCautionSuggestions,
  fetchMyCautions,
  type CautionItem,
  type CautionSuggestion,
  type CautionTargetType,
} from '@/services/caution-api';

import { MyPageSearchField } from './mypage-search-field';
import { ThemedText } from '../ui/themed-text';
import { ThemedView } from '../ui/themed-view';

type WarningTabKey = 'medicine' | 'ingredient';

const warningTabs: { key: WarningTabKey; label: string; targetType: CautionTargetType }[] = [
  { key: 'medicine', label: '약', targetType: 'MEDICINE' },
  { key: 'ingredient', label: '성분', targetType: 'INGREDIENT' },
];

export function WarningItemSection() {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState<WarningTabKey>('ingredient');
  const [keyword, setKeyword] = useState('');
  const [suggestions, setSuggestions] = useState<CautionSuggestion[]>([]);
  const [cautions, setCautions] = useState<CautionItem[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');

  const activeTargetType = useMemo(
    () =>
      warningTabs.find((tab) => tab.key === activeTab)?.targetType ?? 'INGREDIENT',
    [activeTab]
  );

  const filteredCautions = useMemo(
    () => cautions.filter((item) => item.targetType === activeTargetType),
    [activeTargetType, cautions]
  );

  useEffect(() => {
    const loadCautions = async () => {
      try {
        const nextCautions = await fetchMyCautions();
        setCautions(nextCautions);
      } catch (error) {
        setFeedbackMessage(
          error instanceof Error && error.message
            ? error.message
            : '주의 항목 목록을 불러오지 못했어요.'
        );
      } finally {
        setIsLoadingList(false);
      }
    };

    void loadCautions();
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
        const nextSuggestions = await fetchCautionSuggestions(
          trimmedKeyword,
          activeTargetType
        );
        setSuggestions(nextSuggestions);
      } catch (error) {
        setSuggestions([]);
        setFeedbackMessage(
          error instanceof Error && error.message
            ? error.message
            : '주의 항목 자동완성 결과를 불러오지 못했어요.'
        );
      } finally {
        setIsLoadingSuggestions(false);
      }
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [activeTargetType, keyword]);

  const handleCreate = async (caution: CautionSuggestion) => {
    try {
      await createMyCaution({
        targetType: caution.targetType,
        itemSeq: caution.itemSeq,
        itemName: caution.itemName,
        ingredientCode: caution.ingredientCode,
        ingredientName: caution.ingredientName,
        reason: 'OTHER',
      });
      setKeyword('');
      setSuggestions([]);
      setFeedbackMessage('');

      const refreshedCautions = await fetchMyCautions();
      setCautions(refreshedCautions);
    } catch (error) {
      setFeedbackMessage(
        error instanceof Error && error.message
          ? error.message
          : '주의 항목을 등록하지 못했어요.'
      );
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteMyCaution(id);
      setCautions((prev) => prev.filter((item) => item.id !== id));
      setFeedbackMessage('');
    } catch (error) {
      setFeedbackMessage(
        error instanceof Error && error.message
          ? error.message
          : '주의 항목을 삭제하지 못했어요.'
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabRow}>
        {warningTabs.map((tab) => {
          const selected = tab.key === activeTab;

          return (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={[
                styles.tabButton,
                {
                  backgroundColor: selected
                    ? theme.text
                    : theme.backgroundElement,
                },
              ]}>
              <ThemedText
                style={[
                  styles.tabLabel,
                  { color: selected ? theme.background : theme.textSecondary },
                ]}>
                {tab.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      <MyPageSearchField
        placeholder={
          activeTargetType === 'MEDICINE'
            ? '주의할 약 이름을 검색해보세요'
            : '주의할 성분명을 검색해보세요'
        }
        value={keyword}
        onChangeText={setKeyword}
      />

      {isLoadingSuggestions ? (
        <ThemedView type="backgroundElement" style={styles.feedbackCard}>
          <ActivityIndicator />
          <ThemedText themeColor="textSecondary">
            자동완성 결과를 불러오는 중이에요.
          </ThemedText>
        </ThemedView>
      ) : null}

      {suggestions.length > 0 ? (
        <ThemedView type="backgroundElement" style={styles.listCard}>
          {suggestions.map((item, index) => {
            const primaryText =
              activeTargetType === 'MEDICINE' ? item.itemName : item.ingredientName;
            const secondaryText =
              activeTargetType === 'INGREDIENT' && item.itemName
                ? `포함 약: ${item.itemName}`
                : '';

            return (
              <Pressable
                key={`${item.targetType}-${item.itemSeq ?? 'suggestion'}-${item.ingredientCode}-${primaryText}`}
                onPress={() => {
                  void handleCreate(item);
                }}
                style={styles.row}>
                <View style={styles.rowHeader}>
                  <View style={styles.rowCopy}>
                    <ThemedText style={styles.itemTitle}>{primaryText}</ThemedText>
                    {secondaryText ? (
                      <ThemedText themeColor="textSecondary" style={styles.itemMeta}>
                        {secondaryText}
                      </ThemedText>
                    ) : null}
                  </View>
                  <ThemedText themeColor="textSecondary" style={styles.addLabel}>
                    추가
                  </ThemedText>
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
            );
          })}
        </ThemedView>
      ) : null}

      <View style={styles.sectionHeader}>
        <ThemedText style={styles.sectionTitle}>
          {activeTargetType === 'MEDICINE' ? '내 주의 약' : '내 주의 성분'}
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.sectionCount}>
          {filteredCautions.length}개
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
            주의 항목 목록을 불러오는 중이에요.
          </ThemedText>
        </ThemedView>
      ) : filteredCautions.length > 0 ? (
        <ThemedView type="backgroundElement" style={styles.listCard}>
          {filteredCautions.map((item, index) => {
            const primaryText =
              item.targetType === 'MEDICINE' ? item.itemName : item.ingredientName;
            const secondaryText =
              item.targetType === 'INGREDIENT' && item.itemName
                ? `포함 약: ${item.itemName}`
                : '';

            return (
              <View key={item.id} style={styles.row}>
                <View style={styles.rowHeader}>
                  <View style={styles.rowCopy}>
                    <ThemedText style={styles.itemTitle}>{primaryText}</ThemedText>
                    {secondaryText ? (
                      <ThemedText themeColor="textSecondary" style={styles.itemMeta}>
                        {secondaryText}
                      </ThemedText>
                    ) : null}
                  </View>
                  <Pressable
                    onPress={() => {
                      void handleDelete(item.id);
                    }}>
                    <ThemedText themeColor="textSecondary" style={styles.deleteLabel}>
                      삭제
                    </ThemedText>
                  </Pressable>
                </View>

                {index < filteredCautions.length - 1 && (
                  <View
                    style={[
                      styles.divider,
                      { backgroundColor: theme.backgroundSelected },
                    ]}
                  />
                )}
              </View>
            );
          })}
        </ThemedView>
      ) : (
        <ThemedView type="backgroundElement" style={styles.emptyCard}>
          <ThemedText themeColor="textSecondary">
            등록된 주의 항목이 없어요.
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
  tabRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  tabButton: {
    minWidth: 76,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  tabLabel: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '700',
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
  rowCopy: {
    flex: 1,
    gap: 4,
  },
  itemTitle: {
    fontSize: 17,
    lineHeight: 22,
  },
  itemMeta: {
    fontSize: 13,
    lineHeight: 18,
  },
  addLabel: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
  deleteLabel: {
    fontSize: 14,
    lineHeight: 18,
  },
  divider: {
    position: 'absolute',
    left: Spacing.three,
    right: 0,
    bottom: 0,
    height: 1,
  },
});
