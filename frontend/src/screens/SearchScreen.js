import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from "react-native";

import { styles } from "../styles/sharedStyles";

export function SearchScreen({
  searchQuery,
  searchResults,
  searchLoading,
  onChangeSearchQuery,
  onSubmitSearch,
}) {
  function renderResult({ item }) {
    return (
      <View style={styles.searchResultItem}>
        <View style={styles.searchResultMetaRow}>
          <Text style={styles.searchResultType}>
            {item.document_type || "문서"}
          </Text>
          <Text style={styles.searchResultScore}>
            score {Number(item.score || 0).toFixed(3)}
          </Text>
        </View>
        <Text style={styles.searchResultText}>{item.text}</Text>
        {item.medicine_id ? (
          <Text style={styles.searchResultMedicine}>{item.medicine_id}</Text>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.chatCard}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>의약품 검색</Text>
        <Text style={styles.sectionSubtitle}>FastAPI /search 연결</Text>
      </View>

      <View style={styles.inputRow}>
        <TextInput
          value={searchQuery}
          onChangeText={onChangeSearchQuery}
          placeholder="예: 타이레놀 복용 주의사항"
          placeholderTextColor="#7a878e"
          style={styles.input}
          returnKeyType="search"
          onSubmitEditing={onSubmitSearch}
        />
        <Pressable
          disabled={searchLoading || !searchQuery.trim()}
          onPress={onSubmitSearch}
          style={({ pressed }) => [
            styles.button,
            (searchLoading || !searchQuery.trim()) && styles.disabledButton,
            pressed && styles.pressedButton,
          ]}
        >
          <Text style={styles.buttonText}>검색</Text>
        </Pressable>
      </View>

      {searchLoading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator color="#176b87" />
          <Text style={styles.loadingText}>검색 중...</Text>
        </View>
      )}

      <FlatList
        data={searchResults}
        keyExtractor={(item, index) => `${item.medicine_id || "result"}-${index}`}
        renderItem={renderResult}
        contentContainerStyle={styles.searchResultList}
        ListEmptyComponent={
          !searchLoading ? (
            <Text style={styles.emptyResultText}>검색어를 입력해 주세요.</Text>
          ) : null
        }
      />
    </View>
  );
}
