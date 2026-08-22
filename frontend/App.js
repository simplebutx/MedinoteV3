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

function removeSelectedMedicineMention(text, medicine) {
  if (!medicine) {
    return text.trim();
  }

  return text
    .replace(`@${medicine.medicine_name}`, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export default function App() {
  const [activeTab, setActiveTab] = useState("chat");
  const [serverStatus, setServerStatus] = useState("checking");

  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState(initialMessages);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatRooms, setChatRooms] = useState([]);
  const [activeRoomId, setActiveRoomId] = useState(null);
  const [chatView, setChatView] = useState("list");
  const [roomLoading, setRoomLoading] = useState(false);
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

    loadChatRooms();
  }, []);

  const statusText = useMemo(() => {
    if (serverStatus === "online") return "AI 서버 연결됨";
    if (serverStatus === "offline") return "AI 서버 연결 안 됨";
    return "AI 서버 확인 중";
  }, [serverStatus]);

  function mapServerMessage(message) {
    return {
      id: String(message.id),
      role: message.role,
      text: message.content,
      sources: message.sources || [],
    };
  }

  async function loadChatRooms() {
    try {
      const response = await fetch(`${API_BASE_URL}/chat/rooms`);

      if (!response.ok) {
        throw new Error("room list request failed");
      }

      const rooms = await response.json();
      setChatRooms(rooms);
    } catch {
      setChatRooms([]);
    }
  }

  async function createChatRoom() {
    setRoomLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/chat/rooms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: null,
        }),
      });

      if (!response.ok) {
        throw new Error("create room request failed");
      }

      const room = await response.json();
      setChatRooms((current) => [room, ...current]);
      setActiveRoomId(room.id);
      setChatView("detail");
      setMessages(initialMessages);

      return room;
    } catch {
      Alert.alert("채팅방 생성 실패", "FastAPI 서버 연결을 확인해 주세요.");
      return null;
    } finally {
      setRoomLoading(false);
    }
  }

  async function loadRoomMessages(roomId) {
    try {
      const response = await fetch(`${API_BASE_URL}/chat/rooms/${roomId}/messages`);

      if (!response.ok) {
        throw new Error("messages request failed");
      }

      const data = await response.json();
      const nextMessages = data.map(mapServerMessage);
      setMessages(nextMessages.length > 0 ? nextMessages : initialMessages);
    } catch {
      Alert.alert("메시지 조회 실패", "채팅방 메시지를 불러오지 못했습니다.");
    }
  }

  async function selectChatRoom(roomId) {
    if (roomLoading) return;

    setRoomLoading(true);
    setActiveRoomId(roomId);
    setSelectedMedicine(null);
    await loadRoomMessages(roomId);
    setChatView("detail");
    setRoomLoading(false);
  }

  async function showChatRoomList() {
    setChatView("list");
    setQuestion("");
    setSelectedMedicine(null);
    await loadChatRooms();
  }

  function changeChatQuestion(nextQuestion) {
    setQuestion(nextQuestion);
  }

  async function deleteActiveChatRoom() {
    if (!activeRoomId || roomLoading) return;

    setRoomLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/chat/rooms/${activeRoomId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("delete room request failed");
      }

      const nextRooms = chatRooms.filter((room) => room.id !== activeRoomId);
      setChatRooms(nextRooms);

      setActiveRoomId(null);
      setMessages(initialMessages);
      setChatView("list");
    } catch {
      Alert.alert("채팅방 삭제 실패", "채팅방을 삭제하지 못했습니다.");
    } finally {
      setRoomLoading(false);
    }
  }

  async function submitChat() {
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion || chatLoading) return;

    const questionWithoutMention = removeSelectedMedicineMention(
      trimmedQuestion,
      selectedMedicine
    );

    if (!questionWithoutMention) {
      Alert.alert("질문 입력 필요", "선택한 의약품 뒤에 질문을 입력해 주세요.");
      return;
    }

    let roomId = activeRoomId;

    if (!roomId) {
      const room = await createChatRoom();

      if (!room) return;
      roomId = room.id;
    }

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
          room_id: roomId,
          medicine_id: selectedMedicine?.medicine_id ?? null,
          medicine_name: selectedMedicine?.medicine_name ?? null,
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
          sources: data.sources || [],
          fallbacks: data.fallbacks || [],
        },
      ]);
      setActiveRoomId(data.room_id);
      loadChatRooms();
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
        chatRooms={chatRooms}
        activeRoomId={activeRoomId}
        chatView={chatView}
        question={question}
        chatLoading={chatLoading}
        roomLoading={roomLoading}
        selectedMedicine={selectedMedicine}
        onCreateRoom={createChatRoom}
        onDeleteRoom={deleteActiveChatRoom}
        onSelectRoom={selectChatRoom}
        onShowRoomList={showChatRoomList}
        onChangeQuestion={changeChatQuestion}
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
