import { apiFetch } from './api-client';

export type AiHealthResponse = {
  status: string;
  message: string;
};

export type AiChatResponse = {
  room_id: string;
  answer: string;
  question?: string;
};

export type SelectedMedicine = {
  medicine_id: string;
  medicine_name: string;
};

export type AiOcrResponse = {
  filename?: string;
  analysis: string;
};

export type ChatRoom = {
  id: string;
  title?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type ChatMessageRecord = {
  id: number;
  room_id: string;
  role: 'assistant' | 'user' | string;
  content: string;
  created_at: string;
};

type FastApiChatResponse = {
  room_id: string;
  answer: string;
};

export async function fetchAiHealth() {
  const response = await apiFetch('/health');
  const data = (await response.json().catch(() => null)) as
    | AiHealthResponse
    | null;

  if (!response.ok) {
    throw new Error('AI 연결 상태를 확인하지 못했어요.');
  }

  return {
    status: data?.status ?? 'ok',
    message: data?.message ?? 'Medinote AI API is running',
  };
}

export async function fetchChatRooms() {
  const response = await apiFetch('/api/chatbot/rooms');

  if (!response.ok) {
    throw new Error('채팅 목록을 불러오지 못했어요.');
  }

  return (await response.json()) as ChatRoom[];
}

export async function createChatRoom() {
  const response = await apiFetch('/api/chatbot/rooms', {
    method: 'POST',
    body: JSON.stringify({ title: null }),
  });

  if (!response.ok) {
    throw new Error('채팅방을 만들지 못했어요.');
  }

  return (await response.json()) as ChatRoom;
}

export async function fetchChatMessages(roomId: string) {
  const response = await apiFetch(`/api/chatbot/rooms/${roomId}/messages`);

  if (!response.ok) {
    throw new Error('채팅 메시지를 불러오지 못했어요.');
  }

  return (await response.json()) as ChatMessageRecord[];
}

export async function deleteChatRoom(roomId: string) {
  const response = await apiFetch(`/api/chatbot/rooms/${roomId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('채팅방을 삭제하지 못했어요.');
  }
}

export async function deleteChatMessage(messageId: number) {
  const response = await apiFetch(`/api/chatbot/messages/${messageId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('채팅 메시지를 삭제하지 못했어요.');
  }
}

export async function requestAiChat(
  roomId: string,
  question: string,
  selectedMedicine?: SelectedMedicine | null,
) {
  const trimmedQuestion = question.trim();

  if (!trimmedQuestion) {
    throw new Error('질문을 입력해 주세요.');
  }

  const response = await apiFetch('/api/chatbot/message', {
    method: 'POST',
    body: JSON.stringify({
      room_id: roomId,
      medicine_id: selectedMedicine?.medicine_id ?? null,
      medicine_name: selectedMedicine?.medicine_name ?? null,
      question: trimmedQuestion,
    }),
  });
  const data = (await response.json().catch(() => null)) as
    | FastApiChatResponse
    | null;

  if (!response.ok) {
    throw new Error('AI 답변을 받아오지 못했어요.');
  }

  return {
    room_id: data?.room_id ?? roomId,
    answer: data?.answer ?? '답변을 받지 못했어요.',
    question: trimmedQuestion,
  } satisfies AiChatResponse;
}

export async function requestAiOcr(_file: {
  uri: string;
  name?: string | null;
  mimeType?: string | null;
}) {
  return {
    filename: 'mock-upload',
    analysis: 'OCR API는 임시로 꺼둔 상태입니다.',
  };
}
