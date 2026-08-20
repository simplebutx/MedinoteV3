import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from "react-native";
import { useRef } from "react";

import { styles } from "../styles/sharedStyles";

export function ChatScreen({
  messages,
  question,
  chatLoading,
  onChangeQuestion,
  onSubmitChat,
}) {
  const listRef = useRef(null);

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
