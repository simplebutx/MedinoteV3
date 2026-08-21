import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
  View,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";

import { AppHeader } from "./src/components/AppHeader";
import { BottomTabBar } from "./src/components/BottomTabBar";
import { API_BASE_URL } from "./src/constants/api";
import { PAGE_TITLES } from "./src/constants/tabs";
import { ChatScreen } from "./src/screens/ChatScreen";
import { OcrScreen } from "./src/screens/OcrScreen";
import { PlaceholderScreen } from "./src/screens/PlaceholderScreen";
import { SearchScreen } from "./src/screens/SearchScreen";
import { styles } from "./src/styles/sharedStyles";

const initialMessages = [
  {
    id: "welcome",
    role: "assistant",
    text: "복약 정보나 의약품 주의사항을 질문해 주세요.",
  },
];

const DEFAULT_MEDICINE_NAME = "뉴렙톨캡슐300밀리그램(가바펜틴)";

export default function App() {
  const [activeTab, setActiveTab] = useState("chat");
  const [serverStatus, setServerStatus] = useState("checking");

  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState(initialMessages);
  const [chatLoading, setChatLoading] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const [selectedFile, setSelectedFile] = useState(null);
  const [ocrResult, setOcrResult] = useState("");
  const [ocrLoading, setOcrLoading] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE_URL}/health`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("health check failed");
        }
        return response.json();
      })
      .then(() => setServerStatus("online"))
      .catch(() => setServerStatus("offline"));
  }, []);

  const statusText = useMemo(() => {
    if (serverStatus === "online") return "AI 서버 연결됨";
    if (serverStatus === "offline") return "AI 서버 연결 안 됨";
    return "AI 서버 확인 중";
  }, [serverStatus]);

  async function submitChat() {
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion || chatLoading) return;

    const medicineName =
      selectedMedicine?.medicine_name || DEFAULT_MEDICINE_NAME;
    const questionWithoutMention =
      trimmedQuestion.replace(/(^|\s)@[^\s@]+/g, " ").replace(/\s+/g, " ").trim() ||
      trimmedQuestion;

    setQuestion("");
    setMessages((current) => [
      ...current,
      {
        id: `${Date.now()}-user`,
        role: "user",
        text: trimmedQuestion,
      },
    ]);
    setChatLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          medicine_name: medicineName,
          question: questionWithoutMention,
          top_k: 5,
        }),
      });

      if (!response.ok) {
        throw new Error("chat request failed");
      }

      const data = await response.json();

      setMessages((current) => [
        ...current,
        {
          id: `${Date.now()}-assistant`,
          role: "assistant",
          text: data.answer || "답변을 받지 못했습니다.",
        },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: `${Date.now()}-error`,
          role: "assistant",
          text: "서버 연결을 확인한 뒤 다시 시도해 주세요.",
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  async function submitSearch() {
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery || searchLoading) return;

    setSearchLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          medicine_name: selectedMedicine?.medicine_name || DEFAULT_MEDICINE_NAME,
          query: trimmedQuery,
          top_k: 5,
        }),
      });

      if (!response.ok) {
        throw new Error("search request failed");
      }

      const data = await response.json();
      setSearchResults(data.results || []);
    } catch {
      Alert.alert("검색 실패", "FastAPI 서버 연결을 확인해 주세요.");
    } finally {
      setSearchLoading(false);
    }
  }

  async function pickFile() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["image/*", "application/pdf"],
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled) return;
    setSelectedFile(result.assets[0]);
    setOcrResult("");
  }

  async function submitOcr() {
    if (!selectedFile || ocrLoading) return;

    setOcrLoading(true);
    setOcrResult("");

    const formData = new FormData();
    formData.append("file", {
      uri: selectedFile.uri,
      name: selectedFile.name || "upload",
      type: selectedFile.mimeType || "application/octet-stream",
    });

    try {
      const response = await fetch(`${API_BASE_URL}/ocr`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("ocr request failed");
      }

      const data = await response.json();
      setOcrResult(data.analysis || data.text || "OCR 결과를 받지 못했습니다.");
    } catch {
      Alert.alert("OCR 실패", "FastAPI 서버 연결을 확인해 주세요.");
    } finally {
      setOcrLoading(false);
    }
  }

  function renderActiveScreen() {
    if (activeTab === "calendar") {
      return (
        <PlaceholderScreen
          title="복약 달력"
          description="달력 화면은 나중에 연결할 임시 페이지입니다."
        />
      );
    }

    if (activeTab === "search") {
      return (
        <SearchScreen
          searchQuery={searchQuery}
          searchResults={searchResults}
          searchLoading={searchLoading}
          onChangeSearchQuery={setSearchQuery}
          onSubmitSearch={submitSearch}
        />
      );
    }

    if (activeTab === "ocr") {
      return (
        <OcrScreen
          selectedFile={selectedFile}
          ocrLoading={ocrLoading}
          ocrResult={ocrResult}
          onPickFile={pickFile}
          onSubmitOcr={submitOcr}
        />
      );
    }

    if (activeTab === "profile") {
      return (
        <PlaceholderScreen
          title="마이페이지"
          description="마이페이지는 나중에 연결할 임시 페이지입니다."
        />
      );
    }

    return (
      <ChatScreen
        messages={messages}
        question={question}
        chatLoading={chatLoading}
        selectedMedicine={selectedMedicine}
        onChangeQuestion={setQuestion}
        onSelectMedicine={setSelectedMedicine}
        onSubmitChat={submitChat}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.screen}
      >
        <AppHeader
          pageTitle={PAGE_TITLES[activeTab]}
          serverStatus={serverStatus}
          statusText={statusText}
        />

        <View style={styles.pageBody}>{renderActiveScreen()}</View>

        <BottomTabBar activeTab={activeTab} onChangeTab={setActiveTab} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
