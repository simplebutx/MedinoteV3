import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from "react-native";
import { useEffect, useMemo, useRef, useState } from "react";

import { API_BASE_URL } from "../constants/api";
import { styles } from "../styles/sharedStyles";

export function ChatScreen({
  messages,
  question,
  chatLoading,
  selectedMedicine,
  onChangeQuestion,
  onSelectMedicine,
  onSubmitChat,
}) {
  const listRef = useRef(null);
  const [medicineSuggestions, setMedicineSuggestions] = useState([]);
  const [suggestionLoading, setSuggestionLoading] = useState(false);

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

  function renderMessage({ item }) {
    const isUser = item.role === "user";

    return (
      <View style={[styles.messageRow, isUser && styles.userMessageRow]}>
        <View style={[styles.messageBubble, isUser && styles.userBubble]}>
          <Text style={[styles.messageText, isUser && styles.userMessageText]}>
            {item.text}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.chatCard}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Chat</Text>
        <Text style={styles.sectionSubtitle}>FastAPI /chat 연결</Text>
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
          placeholder="예: 타이레놀 복용 시 주의할 점은?"
          placeholderTextColor="#7a878e"
          style={styles.input}
          returnKeyType="send"
          onSubmitEditing={onSubmitChat}
        />
        <Pressable
          disabled={chatLoading || !question.trim()}
          onPress={onSubmitChat}
          style={({ pressed }) => [
            styles.button,
            (chatLoading || !question.trim()) && styles.disabledButton,
            pressed && styles.pressedButton,
          ]}
        >
          <Text style={styles.buttonText}>전송</Text>
        </Pressable>
      </View>
    </View>
  );
}
