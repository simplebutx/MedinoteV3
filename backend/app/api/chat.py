from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session
from app.dependencies.auth import get_current_user
from app.models.user import User

from app.db.mysql import get_db
from app.schemas.chat_schema import (
    ChatMessageResponse,
    ChatRequest,
    ChatResponse,
    ChatRoomResponse,
    CreateChatRoomRequest,
    UpdateChatRoomRequest,
)
from app.services.chat import chat_service

router = APIRouter(prefix="/api/chatbot", tags=["Chatbot"])

@router.post("/message", response_model=ChatResponse)
def chat(
    request: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return chat_service.send_chat_message(
        db=db,
        user_id=current_user.id,
        request=request,
    )


@router.post("/rooms", response_model=ChatRoomResponse)
def create_room(
    request: CreateChatRoomRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return chat_service.create_room(
        db=db,
        user_id=current_user.id,
        request=request,
    )


@router.get("/rooms", response_model=list[ChatRoomResponse])
def read_rooms(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return chat_service.read_rooms(db=db, user_id=current_user.id)


@router.get("/rooms/{room_id}", response_model=ChatRoomResponse)
def read_room(
    room_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return chat_service.read_room(
        db=db,
        user_id=current_user.id,
        room_id=room_id,
    )


@router.patch("/rooms/{room_id}", response_model=ChatRoomResponse)
def update_room(
    room_id: str,
    request: UpdateChatRoomRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return chat_service.update_room(
        db=db,
        user_id=current_user.id,
        room_id=room_id,
        request=request,
    )


@router.delete("/rooms/{room_id}", status_code=204)
def delete_room(
    room_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    chat_service.delete_room(
        db=db,
        user_id=current_user.id,
        room_id=room_id,
    )

    return Response(status_code=204)


@router.get("/rooms/{room_id}/messages", response_model=list[ChatMessageResponse])
def read_room_messages(
    room_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return chat_service.read_room_messages(
        db=db,
        user_id=current_user.id,
        room_id=room_id,
    )


@router.delete("/messages/{message_id}", status_code=204)
def delete_message(
    message_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    chat_service.delete_message(
        db=db,
        user_id=current_user.id,
        message_id=message_id,
    )

    return Response(status_code=204)
