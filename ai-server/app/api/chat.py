from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from app.services.rewrite_service import rewrite_question

from app.crud.chat import (
    create_chat_room,
    create_chat_message,
    delete_chat_room,
    get_chat_messages,
    get_chat_room,
    get_chat_rooms,
    get_recent_chat_messages,
    update_chat_room_title,
    update_chat_room_last_medicine,
)
from app.db.mysql import get_db
from app.schemas.chat_schema import (
    ChatMessageResponse,
    ChatRequest,
    ChatResponse,
    ChatRoomResponse,
    CreateChatRoomRequest,
    UpdateChatRoomRequest,
)
from app.services.chat_graph_service import answer_question_with_graph

router = APIRouter(prefix="/chat", tags=["Chat"])

@router.post("", response_model=ChatResponse)
def chat(
    request: ChatRequest,
    db: Session = Depends(get_db),
):
    room = None

    if request.room_id:
        room = get_chat_room(db=db, room_id=request.room_id)

        if room is None:
            raise HTTPException(status_code=404, detail="Chat room not found")
    else:
        room = create_chat_room(
            db=db,
            title=request.question[:30],
        )

    recent_messages = get_recent_chat_messages(
        db=db,
        room_id=room.id,
        limit=10,
    )

    create_chat_message(
        db=db,
        room_id=room.id,
        role="user",
        content=request.question,
    )

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

    if request.medicine_name:
        room = update_chat_room_last_medicine(
            db=db,
            room_id=room.id,
            medicine_name=request.medicine_name,
            medicine_id=request.medicine_id,
        )

    result = answer_question_with_graph(
        medicine_name=medicine_name,
        question=request.question,
        messages=recent_messages,
        top_k=request.top_k,
    )

    create_chat_message(
        db=db,
        room_id=room.id,
        role="assistant",
        content=result["answer"],
        sources=result.get("sources", []),
    )

    if not room.title:
        room = update_chat_room_title(
            db=db,
            room_id=room.id,
            title=request.question[:30],
        )

    return ChatResponse(room_id=room.id, **result)


@router.post("/rooms", response_model=ChatRoomResponse)
def create_room(
    request: CreateChatRoomRequest,
    db: Session = Depends(get_db),
):
    return create_chat_room(db=db, title=request.title)


@router.get("/rooms", response_model=list[ChatRoomResponse])
def read_rooms(db: Session = Depends(get_db)):
    return get_chat_rooms(db)


@router.get("/rooms/{room_id}", response_model=ChatRoomResponse)
def read_room(
    room_id: str,
    db: Session = Depends(get_db),
):
    room = get_chat_room(db, room_id)

    if room is None:
        raise HTTPException(status_code=404, detail="Chat room not found")

    return room


@router.patch("/rooms/{room_id}", response_model=ChatRoomResponse)
def update_room(
    room_id: str,
    request: UpdateChatRoomRequest,
    db: Session = Depends(get_db),
):
    room = update_chat_room_title(
        db=db,
        room_id=room_id,
        title=request.title,
    )

    if room is None:
        raise HTTPException(status_code=404, detail="Chat room not found")

    return room


@router.delete("/rooms/{room_id}", status_code=204)
def delete_room(
    room_id: str,
    db: Session = Depends(get_db),
):
    deleted = delete_chat_room(db=db, room_id=room_id)

    if not deleted:
        raise HTTPException(status_code=404, detail="Chat room not found")

    return Response(status_code=204)


@router.get("/rooms/{room_id}/messages", response_model=list[ChatMessageResponse])
def read_room_messages(
    room_id: str,
    db: Session = Depends(get_db),
):
    room = get_chat_room(db, room_id)

    if room is None:
        raise HTTPException(status_code=404, detail="Chat room not found")

    return get_chat_messages(db=db, room_id=room_id)
