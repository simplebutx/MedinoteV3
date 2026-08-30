from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.crud.chat import (
    create_chat_message,
    create_chat_room,
    delete_chat_message,
    delete_chat_room,
    get_chat_messages,
    get_chat_room,
    get_chat_rooms,
    get_recent_chat_messages,
    update_chat_room_last_medicine,
    update_chat_room_title,
)
from app.models.chat import ChatMessage, ChatRoom
from app.schemas.chat_schema import (
    ChatRequest,
    ChatResponse,
    CreateChatRoomRequest,
    UpdateChatRoomRequest,
)
from app.services.chatbot.chat_graph_service import answer_question_with_graph

CHAT_TOP_K = 5


def send_chat_message(
    db: Session,
    user_id: int,
    request: ChatRequest,
) -> ChatResponse:

    # 방이 없으면 새로운 방 생성
    if request.room_id:
        room = get_chat_room(db=db, room_id=request.room_id, user_id=user_id)

        if room is None:
            raise HTTPException(status_code=404, detail="Chat room not found")
    else:
        room = create_chat_room(
            db=db,
            user_id=user_id,
            title=request.question[:30],
        )

    # 쿼리재작성용 최근 메시지 조회
    recent_messages = get_recent_chat_messages(
        db=db,
        room_id=room.id,
        limit=10,
    )

    # 메시지 저장
    create_chat_message(
        db=db,
        room_id=room.id,
        role="user",
        content=request.question,
    )

    # 약이름 체크
    medicine_name = request.medicine_name or room.last_medicine_name

    if not medicine_name:
        fallback_answer = (
            "의약품명을 확인할 수 없습니다. "
            "@로 의약품을 선택하거나 질문에 약 이름을 포함해 주세요."
        )

        create_chat_message(
            db=db,
            room_id=room.id,
            role="assistant",
            content=fallback_answer,
            sources=[],
        )

        return ChatResponse(
            room_id=room.id,
            answer=fallback_answer,
            sources=[],
            fallbacks=[
                {
                    "step": "validate_medicine",
                    "reason": "의약품명이 없어 문서 검색을 진행하지 않았습니다.",
                }
            ],
        )

    # 약이름 있으면 최근약 수정
    if request.medicine_name:
        update_chat_room_last_medicine(
            db=db,
            room_id=room.id,
            medicine_name=request.medicine_name,
            medicine_id=request.medicine_id,
        )

    # 랭그래프 실행
    result = answer_question_with_graph(
        medicine_name=medicine_name,
        question=request.question,
        messages=recent_messages,
        top_k=CHAT_TOP_K,
    )

    # 답장 저장
    create_chat_message(
        db=db,
        room_id=room.id,
        role="assistant",
        content=result["answer"],
        sources=result.get("sources", []),
    )

    # 방제목이 없으면 방제목 업데이트
    if not room.title:
        update_chat_room_title(
            db=db,
            room_id=room.id,
            user_id=user_id,
            title=request.question[:30],
        )

    return ChatResponse(room_id=room.id, **result)


def create_room(
    db: Session,
    user_id: int,
    request: CreateChatRoomRequest,
) -> ChatRoom:
    return create_chat_room(db=db, user_id=user_id, title=request.title)


def read_rooms(db: Session, user_id: int) -> list[ChatRoom]:
    return get_chat_rooms(db=db, user_id=user_id)


def read_room(db: Session, user_id: int, room_id: str) -> ChatRoom:
    room = get_chat_room(db=db, room_id=room_id, user_id=user_id)

    if room is None:
        raise HTTPException(status_code=404, detail="Chat room not found")

    return room


def update_room(
    db: Session,
    user_id: int,
    room_id: str,
    request: UpdateChatRoomRequest,
) -> ChatRoom:
    room = update_chat_room_title(
        db=db,
        room_id=room_id,
        user_id=user_id,
        title=request.title,
    )

    if room is None:
        raise HTTPException(status_code=404, detail="Chat room not found")

    return room


def delete_room(db: Session, user_id: int, room_id: str) -> None:
    deleted = delete_chat_room(db=db, room_id=room_id, user_id=user_id)

    if not deleted:
        raise HTTPException(status_code=404, detail="Chat room not found")


def delete_message(db: Session, user_id: int, message_id: int) -> None:
    deleted = delete_chat_message(db=db, message_id=message_id, user_id=user_id)

    if not deleted:
        raise HTTPException(status_code=404, detail="Chat message not found")


def read_room_messages(
    db: Session,
    user_id: int,
    room_id: str,
) -> list[ChatMessage]:
    read_room(db=db, user_id=user_id, room_id=room_id)

    return get_chat_messages(db=db, room_id=room_id)
