import { AppIcon as Ionicons } from '@/components/ui/app-icon';
import { useEffect, useMemo, useState } from 'react';
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
  createMyCaution,
  deleteMyCaution,
  fetchCautionSuggestions,
  fetchMyCautions,
  type CautionItem,
  type CautionReason,
  type CautionReasonValue,
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

const cautionReasonOptions: { value: CautionReason; label: string }[] = [
  { value: 'ALLERGY', label: '알레르기' },
  { value: 'SIDE_EFFECT', label: '부작용' },
  { value: 'OTHER', label: '기타' },
];

const cautionReasonLabels: Record<CautionReason, string> = {
  ALLERGY: '알레르기',
  SIDE_EFFECT: '부작용',
  OTHER: '기타',
};

export function WarningItemSection() {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState<WarningTabKey>('ingredient');
  const [keyword, setKeyword] = useState('');
  const [suggestions, setSuggestions] = useState<CautionSuggestion[]>([]);
  const [cautions, setCautions] = useState<CautionItem[]>([]);
  const [selectedCaution, setSelectedCaution] = useState<CautionSuggestion | null>(null);
  const [selectedReason, setSelectedReason] = useState<CautionReason>('OTHER');
  const [customReason, setCustomReason] = useState('');
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
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

  const handleKeywordChange = (value: string) => {
    setKeyword(value);
    setSelectedCaution(null);
  };

  const clearKeyword = () => {
    setKeyword('');
    setSuggestions([]);
    setSelectedCaution(null);
  };

  const handleTabChange = (tab: WarningTabKey) => {
    setActiveTab(tab);
    setKeyword('');
    setSuggestions([]);
    setSelectedCaution(null);
  };

  const handleSelectSuggestion = (caution: CautionSuggestion) => {
    setSelectedCaution(caution);
    setSelectedReason('OTHER');
    setCustomReason('');
    setFeedbackMessage('');
  };

  const clearSelectedCaution = () => {
    if (isCreating) {
      return;
    }

    setSelectedCaution(null);
    setCustomReason('');
  };

  const handleReasonSelect = (reason: CautionReason) => {
    setSelectedReason(reason);

    if (reason !== 'OTHER') {
      setCustomReason('');
    }
  };

  const handleCreate = async () => {
    if (!selectedCaution) {
      return;
    }

    const reason: CautionReasonValue =
      selectedReason === 'OTHER' ? customReason.trim() : selectedReason;

    if (!reason) {
      setFeedbackMessage('기타 사유를 입력해주세요.');
      return;
    }

    setIsCreating(true);

    try {
      await createMyCaution({
        targetType: selectedCaution.targetType,
        itemSeq: selectedCaution.itemSeq,
        itemName: selectedCaution.itemName,
        ingredientCode: selectedCaution.ingredientCode,
        ingredientName: selectedCaution.ingredientName,
        reason,
      });
      setKeyword('');
      setSuggestions([]);
      setSelectedCaution(null);
      setCustomReason('');
      setFeedbackMessage('');

      const refreshedCautions = await fetchMyCautions();
      setCautions(refreshedCautions);
    } catch (error) {
      setFeedbackMessage(
        error instanceof Error && error.message
          ? error.message
          : '주의 항목을 등록하지 못했어요.'
      );
    } finally {
      setIsCreating(false);
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
              onPress={() => handleTabChange(tab.key)}
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
        onChangeText={handleKeywordChange}
        onClear={clearKeyword}
      />

      {isLoadingSuggestions ? (
        <ThemedView type="backgroundElement" style={styles.feedbackCard}>
          <ActivityIndicator />
          <ThemedText themeColor="textSecondary">
            자동완성 결과를 불러오는 중이에요.
          </ThemedText>
        </ThemedView>
      ) : null}

      {selectedCaution ? (
        <ThemedView type="backgroundElement" style={styles.selectionCard}>
          <View style={styles.selectionHeader}>
            <View style={styles.rowCopy}>
              <ThemedText themeColor="textSecondary" style={styles.selectionLabel}>
                후보 선택
              </ThemedText>
              <ThemedText style={styles.selectedTitle}>
                {selectedCaution.targetType === 'MEDICINE'
                  ? selectedCaution.itemName
                  : selectedCaution.ingredientName}
              </ThemedText>
              {selectedCaution.targetType === 'INGREDIENT' && selectedCaution.itemName ? (
                <ThemedText themeColor="textSecondary" style={styles.itemMeta}>
                  포함 약: {selectedCaution.itemName}
                </ThemedText>
              ) : null}
            </View>
            <Pressable
              onPress={clearSelectedCaution}
              disabled={isCreating}
              style={[
                styles.iconButton,
                { backgroundColor: theme.backgroundSelected },
              ]}>
              <Ionicons name="close" size={18} color={theme.textSecondary} />
            </Pressable>
          </View>

          <View
            style={[
              styles.sectionDivider,
              { backgroundColor: theme.backgroundSelected },
            ]}
          />

          <View style={styles.reasonSection}>
            <ThemedText themeColor="textSecondary" style={styles.reasonLabel}>
              등록 사유
            </ThemedText>
            <View style={styles.reasonRow}>
              {cautionReasonOptions.map((option) => {
                const selected = option.value === selectedReason;

                return (
                  <Pressable
                    key={option.value}
                    onPress={() => handleReasonSelect(option.value)}
                    style={[
                      styles.reasonButton,
                      {
                        backgroundColor: selected
                          ? theme.text
                          : theme.backgroundSelected,
                      },
                    ]}>
                    <ThemedText
                      style={[
                        styles.reasonButtonLabel,
                        { color: selected ? theme.background : theme.textSecondary },
                      ]}>
                      {option.label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
            {selectedReason === 'OTHER' ? (
              <ThemedView type="background" style={styles.customReasonWrap}>
                <TextInput
                  placeholder="주의해야 하는 이유를 입력하세요"
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.customReasonInput, { color: theme.text }]}
                  value={customReason}
                  onChangeText={setCustomReason}
                  editable={!isCreating}
                  multiline
                  textAlignVertical="top"
                />
              </ThemedView>
            ) : null}
          </View>

          <Pressable
            onPress={() => {
              void handleCreate();
            }}
            disabled={isCreating}
            style={[
              styles.saveButton,
              {
                backgroundColor: theme.text,
                opacity: isCreating ? 0.7 : 1,
              },
            ]}>
            {isCreating ? (
              <ActivityIndicator color={theme.background} />
            ) : (
              <ThemedText style={[styles.saveButtonLabel, { color: theme.background }]}>
                저장
              </ThemedText>
            )}
          </Pressable>
        </ThemedView>
      ) : suggestions.length > 0 ? (
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
                onPress={() => handleSelectSuggestion(item)}
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
            const reasonText = formatCautionReason(item.reason);

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
                    {reasonText ? (
                      <ThemedText themeColor="textSecondary" style={styles.itemMeta}>
                        {reasonText}
                      </ThemedText>
                    ) : null}
                  </View>
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

function formatCautionReason(reason: CautionReasonValue | null) {
  if (!reason) {
    return '';
  }

  if (reason === 'ALLERGY' || reason === 'SIDE_EFFECT' || reason === 'OTHER') {
    return cautionReasonLabels[reason];
  }

  return reason;
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
  selectionCard: {
    borderRadius: 18,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  selectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  selectionLabel: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
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
  selectedTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
  },
  sectionDivider: {
    height: 1,
    opacity: 0.7,
  },
  reasonSection: {
    gap: Spacing.two,
  },
  reasonLabel: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  reasonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  reasonButton: {
    minHeight: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  reasonButtonLabel: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
  customReasonWrap: {
    minHeight: 88,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  customReasonInput: {
    minHeight: 68,
    fontSize: 15,
    lineHeight: 21,
    padding: 0,
  },
  saveButton: {
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonLabel: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '700',
  },
});
