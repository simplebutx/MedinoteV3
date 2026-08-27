import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppScreen } from '@/components/common/app-screen';
import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { buildApiUrl } from '@/constants/api';
import { Spacing, TopOverlayClearance } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  createChatRoom,
  deleteChatRoom,
  fetchChatMessages,
  fetchChatRooms,
  requestAiChat,
  type ChatRoom,
  type SelectedMedicine,
} from '@/services/ai-api';

type ChatView = 'rooms' | 'detail';

type ChatMessage = {
  id: string;
  role: 'assistant' | 'user';
  text: string;
};

type MedicineSuggestResponse = {
  results?: SelectedMedicine[];
};

const initialMessages: ChatMessage[] = [
  {
    id: 'welcome',
    role: 'assistant',
    text: '복약 정보나 의약품 주의사항을 질문해 주세요.',
  },
];

function removeSelectedMedicineMention(
  text: string,
  medicine: SelectedMedicine | null,
) {
  if (!medicine) {
    return text.trim();
  }

  return text
    .replace(`@${medicine.medicine_name}`, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatRoomTime(value?: string) {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
  });
}

function mapStoredMessages(messages: Awaited<ReturnType<typeof fetchChatMessages>>) {
  const mappedMessages = messages.map<ChatMessage>((message) => ({
    id: String(message.id),
    role: message.role === 'user' ? 'user' : 'assistant',
    text: message.content,
  }));

  return mappedMessages.length > 0 ? mappedMessages : initialMessages;
}

export default function ChatbotScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const [view, setView] = useState<ChatView>('rooms');
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [question, setQuestion] = useState('');
  const [isRoomLoading, setIsRoomLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedMedicine, setSelectedMedicine] = useState<SelectedMedicine | null>(null);
  const [medicineSuggestions, setMedicineSuggestions] = useState<SelectedMedicine[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);

  const questionBody = removeSelectedMedicineMention(question, selectedMedicine);
  const canSend = questionBody.trim().length > 0 && !isSending && Boolean(activeRoomId);

  const mentionQuery = useMemo(() => {
    const match = question.match(/(?:^|\s)@([^\s@]*)$/);
    return match ? match[1] : null;
  }, [question]);

  const loadRooms = useCallback(async () => {
    setIsRoomLoading(true);
    setErrorMessage('');

    try {
      const nextRooms = await fetchChatRooms();
      setRooms(nextRooms);
    } catch (error) {
      setRooms([]);
      setErrorMessage(
        error instanceof Error ? error.message : '채팅 목록을 불러오지 못했어요.',
      );
    } finally {
      setIsRoomLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRooms();
  }, [loadRooms]);

  useEffect(() => {
    let isActive = true;

    if (mentionQuery === null || mentionQuery.trim().length === 0) {
      setMedicineSuggestions([]);
      setIsSuggesting(false);
      return undefined;
    }

    setIsSuggesting(true);

    const timeoutId = setTimeout(() => {
      fetch(
        buildApiUrl(
          `/search/medicines?q=${encodeURIComponent(mentionQuery)}&limit=6`,
        ),
      )
        .then((response) => {
          if (!response.ok) {
            throw new Error('medicine suggest failed');
          }

          return response.json() as Promise<MedicineSuggestResponse>;
        })
        .then((data) => {
          if (isActive) {
            setMedicineSuggestions(data.results ?? []);
          }
        })
        .catch(() => {
          if (isActive) {
            setMedicineSuggestions([]);
          }
        })
        .finally(() => {
          if (isActive) {
            setIsSuggesting(false);
          }
        });
    }, 180);

    return () => {
      isActive = false;
      clearTimeout(timeoutId);
    };
  }, [mentionQuery]);

  async function openRoom(roomId: string) {
    if (isRoomLoading) {
      return;
    }

    setIsRoomLoading(true);
    setErrorMessage('');
    setQuestion('');
    setSelectedMedicine(null);
    setActiveRoomId(roomId);

    try {
      const storedMessages = await fetchChatMessages(roomId);
      setMessages(mapStoredMessages(storedMessages));
      setView('detail');
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : '채팅방을 열지 못했어요.',
      );
    } finally {
      setIsRoomLoading(false);
    }
  }

  async function startNewRoom() {
    if (isRoomLoading) {
      return;
    }

    setIsRoomLoading(true);
    setErrorMessage('');

    try {
      const room = await createChatRoom();
      setRooms((current) => [room, ...current]);
      setActiveRoomId(room.id);
      setMessages(initialMessages);
      setQuestion('');
      setSelectedMedicine(null);
      setView('detail');
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : '새 채팅을 만들지 못했어요.',
      );
    } finally {
      setIsRoomLoading(false);
    }
  }

  async function removeActiveRoom() {
    if (!activeRoomId || isRoomLoading) {
      return;
    }

    setIsRoomLoading(true);
    setErrorMessage('');

    try {
      await deleteChatRoom(activeRoomId);
      setRooms((current) => current.filter((room) => room.id !== activeRoomId));
      setActiveRoomId(null);
      setMessages(initialMessages);
      setQuestion('');
      setSelectedMedicine(null);
      setView('rooms');
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : '채팅방을 삭제하지 못했어요.',
      );
    } finally {
      setIsRoomLoading(false);
    }
  }

  function showRoomList() {
    setView('rooms');
    setQuestion('');
    setSelectedMedicine(null);
    setMedicineSuggestions([]);
    void loadRooms();
  }

  function selectMedicine(medicine: SelectedMedicine) {
    const nextQuestion = question.replace(
      /(^|\s)@[^\s@]*$/,
      `$1@${medicine.medicine_name} `,
    );

    setSelectedMedicine(medicine);
    setQuestion(nextQuestion);
    setMedicineSuggestions([]);
  }

  async function submitMessage() {
    const trimmedQuestion = question.trim();
    const cleanedQuestion = questionBody.trim();

    if (!cleanedQuestion || isSending || !activeRoomId) {
      return;
    }

    setQuestion('');
    setMessages((current) => [
      ...current,
      {
        id: `${Date.now()}-user`,
        role: 'user',
        text: trimmedQuestion,
      },
    ]);
    setIsSending(true);

    try {
      const response = await requestAiChat(
        activeRoomId,
        cleanedQuestion,
        selectedMedicine,
      );
      setMessages((current) => [
        ...current,
        {
          id: `${Date.now()}-assistant`,
          role: 'assistant',
          text: response.answer || '답변을 받지 못했어요.',
        },
      ]);
      void loadRooms();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'AI 답변을 받아오지 못했어요.';

      setMessages((current) => [
        ...current,
        {
          id: `${Date.now()}-error`,
          role: 'assistant',
          text: message,
        },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  function renderRoom({ item, index }: { item: ChatRoom; index: number }) {
    const title = item.title || `채팅 ${index + 1}`;

    return (
      <Pressable
        disabled={isRoomLoading}
        onPress={() => {
          void openRoom(item.id);
        }}
        style={({ pressed }) => [
          styles.roomItem,
          pressed && styles.pressedItem,
        ]}
      >
        <View style={styles.roomAvatar}>
          <ThemedText style={styles.roomAvatarText}>{title.slice(0, 1)}</ThemedText>
        </View>
        <View style={styles.roomCopy}>
          <ThemedText numberOfLines={1} style={styles.roomTitle}>
            {title}
          </ThemedText>
          <ThemedText numberOfLines={1} themeColor="textSecondary" style={styles.roomSubtitle}>
            저장된 복약 상담 세션
          </ThemedText>
        </View>
        <ThemedText themeColor="textSecondary" style={styles.roomTime}>
          {formatRoomTime(item.updated_at)}
        </ThemedText>
      </Pressable>
    );
  }

  function renderMessage({ item }: { item: ChatMessage }) {
    const isUser = item.role === 'user';

    return (
      <View
        style={[
          styles.messageRow,
          isUser ? styles.userMessageRow : styles.assistantMessageRow,
        ]}
      >
        {!isUser && (
          <View style={styles.avatar}>
            <Ionicons name="sparkles" size={15} color="#FFFFFF" />
          </View>
        )}
        <View
          style={[
            styles.bubble,
            {
              backgroundColor: isUser ? '#1F7A5C' : theme.backgroundElement,
            },
          ]}
        >
          <ThemedText style={[styles.messageText, isUser && styles.userMessageText]}>
            {item.text}
          </ThemedText>
        </View>
      </View>
    );
  }

  return (
    <AppScreen showChatbotFab={false}>
      <ThemedView style={styles.screen}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={insets.top + TopOverlayClearance}
          style={styles.keyboardView}
        >
          <View
            style={[
              styles.content,
              {
                paddingTop: insets.top + TopOverlayClearance + 28,
                paddingBottom: insets.bottom + Spacing.three,
              },
            ]}
          >
            {view === 'rooms' ? (
              <>
                <View style={styles.headerRow}>
                  <View style={styles.headerCopy}>
                    <ThemedText themeColor="textSecondary" style={styles.eyebrow}>
                      AI CHAT
                    </ThemedText>
                    <ThemedText style={styles.title}>채팅</ThemedText>
                  </View>
                  <Pressable
                    disabled={isRoomLoading}
                    onPress={() => {
                      void startNewRoom();
                    }}
                    style={[styles.headerButton, isRoomLoading && styles.disabledButton]}
                  >
                    <Ionicons name="add" size={22} color="#FFFFFF" />
                  </Pressable>
                </View>

                {errorMessage ? (
                  <ThemedView type="backgroundElement" style={styles.errorCard}>
                    <ThemedText themeColor="textSecondary" style={styles.errorText}>
                      {errorMessage}
                    </ThemedText>
                  </ThemedView>
                ) : null}

                {isRoomLoading && rooms.length === 0 ? (
                  <View style={styles.centerState}>
                    <ActivityIndicator color={theme.textSecondary} />
                    <ThemedText themeColor="textSecondary" style={styles.centerText}>
                      채팅 목록 불러오는 중
                    </ThemedText>
                  </View>
                ) : (
                  <FlatList
                    data={rooms}
                    keyExtractor={(item) => item.id}
                    renderItem={renderRoom}
                    contentContainerStyle={styles.roomList}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                      <View style={styles.centerState}>
                        <ThemedText style={styles.emptyTitle}>아직 채팅방이 없어요</ThemedText>
                        <ThemedText themeColor="textSecondary" style={styles.centerText}>
                          + 버튼을 눌러 복약 상담을 시작하세요.
                        </ThemedText>
                      </View>
                    }
                  />
                )}
              </>
            ) : (
              <>
                <View style={styles.detailHeaderRow}>
                  <Pressable onPress={showRoomList} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={18} color={theme.text} />
                    <ThemedText style={styles.backButtonText}>채팅 목록</ThemedText>
                  </Pressable>
                  <Pressable
                    disabled={!activeRoomId || isRoomLoading}
                    onPress={() => {
                      void removeActiveRoom();
                    }}
                    style={[styles.deleteButton, (!activeRoomId || isRoomLoading) && styles.disabledButton]}
                  >
                    <Ionicons name="trash-outline" size={18} color="#FF6B81" />
                  </Pressable>
                </View>

                <View style={styles.headerCopy}>
                  <ThemedText themeColor="textSecondary" style={styles.eyebrow}>
                    AI CHAT
                  </ThemedText>
                  <ThemedText style={styles.title}>복약 AI 챗봇</ThemedText>
                </View>

                <FlatList
                  ref={listRef}
                  data={messages}
                  keyExtractor={(item) => item.id}
                  onContentSizeChange={() =>
                    listRef.current?.scrollToEnd({ animated: true })
                  }
                  contentContainerStyle={styles.messageList}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  renderItem={renderMessage}
                  ListFooterComponent={
                    isSending ? (
                      <View style={styles.assistantMessageRow}>
                        <View style={styles.avatar}>
                          <Ionicons name="sparkles" size={15} color="#FFFFFF" />
                        </View>
                        <View
                          style={[
                            styles.loadingBubble,
                            { backgroundColor: theme.backgroundElement },
                          ]}
                        >
                          <ActivityIndicator size="small" color={theme.textSecondary} />
                          <ThemedText
                            themeColor="textSecondary"
                            style={styles.loadingText}
                          >
                            답변 작성 중
                          </ThemedText>
                        </View>
                      </View>
                    ) : null
                  }
                />

                {(isSuggesting || medicineSuggestions.length > 0) && (
                  <ThemedView type="backgroundElement" style={styles.suggestionPanel}>
                    {isSuggesting ? (
                      <View style={styles.suggestionLoadingRow}>
                        <ActivityIndicator size="small" color={theme.textSecondary} />
                        <ThemedText
                          themeColor="textSecondary"
                          style={styles.suggestionHint}
                        >
                          약 이름 검색 중
                        </ThemedText>
                      </View>
                    ) : medicineSuggestions.length > 0 ? (
                      medicineSuggestions.map((medicine) => (
                        <Pressable
                          key={medicine.medicine_id}
                          onPress={() => selectMedicine(medicine)}
                          style={({ pressed }) => [
                            styles.suggestionItem,
                            pressed && styles.pressedItem,
                          ]}
                        >
                          <ThemedText style={styles.suggestionName}>
                            {medicine.medicine_name}
                          </ThemedText>
                          <ThemedText
                            themeColor="textSecondary"
                            style={styles.suggestionId}
                          >
                            {medicine.medicine_id}
                          </ThemedText>
                        </Pressable>
                      ))
                    ) : (
                      <ThemedText
                        themeColor="textSecondary"
                        style={styles.suggestionHint}
                      >
                        검색 결과가 없어요
                      </ThemedText>
                    )}
                  </ThemedView>
                )}

                <View
                  style={[
                    styles.inputBar,
                    { backgroundColor: theme.backgroundElement },
                  ]}
                >
                  <TextInput
                    value={question}
                    onChangeText={setQuestion}
                    placeholder="@로 약을 선택하거나 질문 입력"
                    placeholderTextColor={theme.textSecondary}
                    multiline
                    returnKeyType="send"
                    onSubmitEditing={submitMessage}
                    style={[styles.input, { color: theme.text }]}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="메시지 보내기"
                    disabled={!canSend}
                    onPress={submitMessage}
                    style={[
                      styles.sendButton,
                      !canSend && styles.sendButtonDisabled,
                    ]}
                  >
                    <Ionicons name="send" size={18} color="#FFFFFF" />
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </ThemedView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  detailHeaderRow: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  headerCopy: {
    gap: Spacing.one,
  },
  eyebrow: {
    fontSize: 14,
    lineHeight: 18,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
  },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1F7A5C',
  },
  backButton: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  backButtonText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  deleteButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 107, 129, 0.12)',
  },
  disabledButton: {
    opacity: 0.45,
  },
  roomList: {
    flexGrow: 1,
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  roomItem: {
    minHeight: 74,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    backgroundColor: '#212225',
  },
  pressedItem: {
    opacity: 0.72,
  },
  roomAvatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2F6F7E',
  },
  roomAvatarText: {
    color: '#FFFFFF',
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '800',
  },
  roomCopy: {
    flex: 1,
    gap: 2,
  },
  roomTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
  },
  roomSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  roomTime: {
    fontSize: 12,
    lineHeight: 16,
  },
  centerState: {
    flex: 1,
    minHeight: 260,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  emptyTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
  },
  centerText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  errorCard: {
    borderRadius: 16,
    padding: Spacing.three,
  },
  errorText: {
    fontSize: 14,
    lineHeight: 20,
  },
  messageList: {
    flexGrow: 1,
    gap: Spacing.two,
    justifyContent: 'flex-end',
    paddingVertical: Spacing.one,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
  },
  assistantMessageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    justifyContent: 'flex-start',
  },
  userMessageRow: {
    justifyContent: 'flex-end',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2F6F7E',
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  loadingBubble: {
    minHeight: 42,
    maxWidth: '82%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  loadingText: {
    fontSize: 14,
    lineHeight: 20,
  },
  suggestionPanel: {
    maxHeight: 220,
    borderRadius: 8,
    overflow: 'hidden',
  },
  suggestionLoadingRow: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  suggestionItem: {
    minHeight: 58,
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  suggestionName: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },
  suggestionId: {
    fontSize: 12,
    lineHeight: 16,
  },
  suggestionHint: {
    fontSize: 14,
    lineHeight: 20,
  },
  inputBar: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    borderRadius: 8,
    padding: Spacing.two,
  },
  input: {
    maxHeight: 112,
    flex: 1,
    paddingHorizontal: Spacing.two,
    paddingVertical: Platform.select({ ios: 10, default: 6 }),
    fontSize: 16,
    lineHeight: 22,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1F7A5C',
  },
  sendButtonDisabled: {
    opacity: 0.45,
  },
});
