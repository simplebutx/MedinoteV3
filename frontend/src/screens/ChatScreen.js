import { ActivityIndicator, FlatList, Linking, Platform, Pressable, Text, TextInput, View } from "react-native";
import { useEffect, useMemo, useRef, useState } from "react";

import { API_BASE_URL } from "../constants/api";
import { styles } from "../styles/sharedStyles";

function removeSelectedMedicineMention(text, medicine) {
  if (!medicine) {
    return text.trim();
  }

  return text
    .replace(`@${medicine.medicine_name}`, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripMarkdown(text) {
  return String(text || "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s{0,3}[-*]\s+/gm, "")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/\*/g, "");
}

export function ChatScreen({
  messages,
  chatRooms,
  activeRoomId,
  chatView,
  question,
  chatLoading,
  roomLoading,
  selectedMedicine,
  onCreateRoom,
  onDeleteRoom,
  onSelectRoom,
  onShowRoomList,
  onChangeQuestion,
  onSelectMedicine,
  onSubmitChat,
}) {
  const listRef = useRef(null);
  const [medicineSuggestions, setMedicineSuggestions] = useState([]);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const questionBody = removeSelectedMedicineMention(question, selectedMedicine);
  const canSubmitChat = Boolean(questionBody.trim() && !chatLoading);

  const mentionQuery = useMemo(() => {
    const match = question.match(/(?:^|\s)@([^\s@]*)$/);
    return match ? match[1] : null;
  }, [question]);

  useEffect(() => {
    let isActive = true;

    if (mentionQuery === null || mentionQuery.trim().length === 0) {
      setMedicineSuggestions([]);
      setSuggestionLoading(false);
      return undefined;
    }

    setSuggestionLoading(true);

    const timeoutId = setTimeout(() => {
      fetch(
        `${API_BASE_URL}/search/medicines?q=${encodeURIComponent(
          mentionQuery
        )}&limit=6`
      )
        .then((response) => {
          if (!response.ok) {
            throw new Error("medicine suggest failed");
          }
          return response.json();
        })
        .then((data) => {
          if (isActive) {
            setMedicineSuggestions(data.results || []);
          }
        })
        .catch(() => {
          if (isActive) {
            setMedicineSuggestions([]);
          }
        })
        .finally(() => {
          if (isActive) {
            setSuggestionLoading(false);
          }
        });
    }, 180);

    return () => {
      isActive = false;
      clearTimeout(timeoutId);
    };
  }, [mentionQuery]);

  function selectMedicine(medicine) {
    const nextQuestion = question.replace(
      /(^|\s)@[^\s@]*$/,
      `$1@${medicine.medicine_name} `
    );

    onSelectMedicine(medicine);
    onChangeQuestion(nextQuestion);
    setMedicineSuggestions([]);
  }

  function submitQuestion() {
    if (canSubmitChat) {
      onSubmitChat();
    }
  }

  function handleInputKeyPress(event) {
    if (event.nativeEvent.key !== "Enter") {
      return;
    }

    event.preventDefault?.();
    submitQuestion();
  }

  function renderMessage({ item }) {
    const isUser = item.role === "user";
    const sources = item.sources || [];

    return (
      <View style={[styles.messageRow, isUser && styles.userMessageRow]}>
        <View style={[styles.messageBubble, isUser && styles.userBubble]}>
          <Text style={[styles.messageText, isUser && styles.userMessageText]}>
            {isUser ? item.text : stripMarkdown(item.text)}
          </Text>
          {!isUser && sources.length > 0 ? (
            <View style={styles.messageSources}>
              {sources.map((source, index) => (
                <Pressable
                  key={`${source.name || "source"}-${index}`}
                  disabled={!source.url}
                  onPress={() => source.url && Linking.openURL(source.url)}
                >
                  <Text style={styles.messageSourceText}>
                    출처: {source.name || "알 수 없음"}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      </View>
    );
  }

  function formatRoomTime(value) {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toLocaleDateString("ko-KR", {
      month: "short",
      day: "numeric",
    });
  }

  function renderRoom({ item, index }) {
    const isActive = item.id === activeRoomId;
    const title = item.title || `채팅 ${index + 1}`;

    return (
      <Pressable
        disabled={roomLoading}
        onPress={() => onSelectRoom(item.id)}
        style={({ pressed }) => [
          styles.roomListItem,
          isActive && styles.activeRoomListItem,
          pressed && styles.pressedButton,
        ]}
      >
        <View style={styles.roomAvatar}>
          <Text style={styles.roomAvatarText}>{title.slice(0, 1)}</Text>
        </View>
        <View style={styles.roomListTextBlock}>
          <Text numberOfLines={1} style={styles.roomListTitle}>
            {title}
          </Text>
          <Text numberOfLines={1} style={styles.roomListSubtitle}>
            저장된 복약 상담 세션
          </Text>
        </View>
        <Text style={styles.roomListTime}>{formatRoomTime(item.updated_at)}</Text>
      </Pressable>
    );
  }

  if (chatView === "list") {
    return (
      <View style={styles.chatCard}>
        <View style={styles.sectionHeader}>
          <View style={styles.chatHeaderRow}>
            <View style={styles.titleBlock}>
              <Text style={styles.sectionTitle}>채팅</Text>
              <Text style={styles.sectionSubtitle}>저장된 상담 세션</Text>
            </View>
            <Pressable
              disabled={roomLoading}
              onPress={onCreateRoom}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.pressedButton,
              ]}
            >
              <Text style={styles.secondaryButtonText}>+ 새 채팅</Text>
            </Pressable>
          </View>
        </View>

        {chatRooms.length > 0 ? (
          <FlatList
            data={chatRooms}
            keyExtractor={(item) => item.id}
            renderItem={renderRoom}
            contentContainerStyle={styles.roomListPage}
          />
        ) : (
          <View style={styles.emptyRoomState}>
            <Text style={styles.emptyRoomTitle}>아직 채팅방이 없어요</Text>
            <Text style={styles.emptyRoomText}>
              새 채팅을 눌러 복약 상담을 시작하세요.
            </Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.chatCard}>
      <View style={styles.sectionHeader}>
        <View style={styles.chatHeaderRow}>
          <View style={styles.titleBlock}>
            <Pressable
              disabled={roomLoading}
              onPress={onShowRoomList}
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.pressedButton,
              ]}
            >
              <Text style={styles.backButtonText}>‹ 채팅 목록</Text>
            </Pressable>
            <Text style={styles.sectionTitle}>상담 세션</Text>
          </View>
          <View style={styles.roomActionRow}>
            <Pressable
              disabled={roomLoading || !activeRoomId}
              onPress={onDeleteRoom}
              style={({ pressed }) => [
                styles.dangerButton,
                (!activeRoomId || roomLoading) && styles.disabledLightButton,
                pressed && styles.pressedButton,
              ]}
            >
              <Text style={styles.dangerButtonText}>삭제</Text>
            </Pressable>
          </View>
        </View>
      </View>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.chatList}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
      />
      {chatLoading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator color="#176b87" />
          <Text style={styles.loadingText}>답변 생성 중...</Text>
        </View>
      )}
      {(suggestionLoading || medicineSuggestions.length > 0) && (
        <View style={styles.mentionSuggestBox}>
          {suggestionLoading ? (
            <View style={styles.mentionSuggestLoading}>
              <ActivityIndicator color="#176b87" size="small" />
              <Text style={styles.mentionSuggestHint}>약 이름 검색 중...</Text>
            </View>
          ) : medicineSuggestions.length > 0 ? (
            medicineSuggestions.map((medicine) => (
              <Pressable
                key={medicine.medicine_id}
                onPress={() => selectMedicine(medicine)}
                style={({ pressed }) => [
                  styles.mentionSuggestItem,
                  pressed && styles.pressedButton,
                ]}
              >
                <Text style={styles.mentionSuggestName}>
                  {medicine.medicine_name}
                </Text>
                <Text style={styles.mentionSuggestId}>
                  {medicine.medicine_id}
                </Text>
              </Pressable>
            ))
          ) : null}
        </View>
      )}
      <View style={styles.inputRow}>
        <TextInput
          value={question}
          onChangeText={onChangeQuestion}
          placeholder="@로 약이름 선택 또는 질문 입력"
          placeholderTextColor="#7a878e"
          style={styles.input}
          returnKeyType="send"
          autoCorrect={false}
          spellCheck={false}
          autoComplete="off"
          importantForAutofill="no"
          textContentType="none"
          onSubmitEditing={Platform.OS === "web" ? undefined : submitQuestion}
          onKeyPress={Platform.OS === "web" ? handleInputKeyPress : undefined}
        />
        <Pressable
          disabled={!canSubmitChat}
          onPress={onSubmitChat}
          style={({ pressed }) => [
            styles.button,
            !canSubmitChat && styles.disabledButton,
            pressed && styles.pressedButton,
          ]}
        >
          <Text style={styles.buttonText}>전송</Text>
        </Pressable>
      </View>
    </View>
  );
}
