import { Pressable, Text, View } from "react-native";

import { styles } from "../styles/sharedStyles";

export function OcrScreen({
  selectedFile,
  ocrLoading,
  ocrResult,
  onPickFile,
  onSubmitOcr,
}) {
  return (
    <View style={styles.ocrCard}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>OCR</Text>
        <Text style={styles.sectionSubtitle}>FastAPI /ocr 연결</Text>
      </View>
      <View style={styles.ocrActions}>
        <Pressable style={styles.fileButton} onPress={onPickFile}>
          <Text style={styles.fileButtonText}>
            {selectedFile ? selectedFile.name : "파일 선택"}
          </Text>
        </Pressable>
        <Pressable
          disabled={!selectedFile || ocrLoading}
          onPress={onSubmitOcr}
          style={({ pressed }) => [
            styles.button,
            (!selectedFile || ocrLoading) && styles.disabledButton,
            pressed && styles.pressedButton,
          ]}
        >
          <Text style={styles.buttonText}>{ocrLoading ? "분석 중" : "OCR 실행"}</Text>
        </Pressable>
      </View>
      <Text style={styles.ocrResult}>
        {ocrResult || "아직 분석 결과가 없습니다."}
      </Text>
    </View>
  );
}
