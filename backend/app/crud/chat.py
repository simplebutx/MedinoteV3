from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session
from sqlalchemy.sql import func

from app.models.chat import ChatMessage, ChatRoom

# 채팅방 만들기
def create_chat_room(
    db: Session,
    user_id: int,
    title: str | None = None,
) -> ChatRoom:
    room = ChatRoom(
        id=str(uuid4()),
        user_id=user_id,
        title=title,
    )

    db.add(room)
    db.commit()
    db.refresh(room)

    return room

# 채팅방 목록 보기
def get_chat_rooms(db: Session, user_id: int) -> list[ChatRoom]:
    stmt = (
        select(ChatRoom)
        .where(ChatRoom.user_id == user_id)
        .order_by(ChatRoom.updated_at.desc())
    )

    return list(db.scalars(stmt).all())

# 채팅방 하나 찾기
def get_chat_room(
    db: Session,
    room_id: str,
    user_id: int | None = None,
) -> ChatRoom | None:
    stmt = select(ChatRoom).where(ChatRoom.id == room_id)

    if user_id is not None:
        stmt = stmt.where(ChatRoom.user_id == user_id)

    return db.scalar(stmt)

# 채팅방 제목 수정
def update_chat_room_title(
    db: Session,
    room_id: str,
    user_id: int | None,
    title: str,
) -> ChatRoom | None:
    room = get_chat_room(db=db, room_id=room_id, user_id=user_id)

    if room is None:
        return None

    room.title = title
    db.commit()
    db.refresh(room)

    return room

# 채팅방 삭제
def delete_chat_room(
    db: Session,
    room_id: str,
    user_id: int,
) -> bool:
    room = get_chat_room(db=db, room_id=room_id, user_id=user_id)

    if room is None:
        return False

    db.delete(room)
    db.commit()

    return True

# 메시지 저장
def create_chat_message(
    db: Session,
    room_id: str,
    role: str,
    content: str,
    sources: list[dict] | None = None,
) -> ChatMessage:
    message = ChatMessage(
        room_id=room_id,
        role=role,
        content=content,
        sources=sources,
    )

    db.add(message)
    room = get_chat_room(db=db, room_id=room_id)

    if room is not None:
        room.updated_at = func.now()

    db.commit()
    db.refresh(message)

    return message

# 채팅방 메시지 전체 조회
def get_chat_messages(
    db: Session,
    room_id: str,
) -> list[ChatMessage]:
    stmt = (
        select(ChatMessage)
        .where(ChatMessage.room_id == room_id)
        .order_by(ChatMessage.created_at.asc(), ChatMessage.id.asc())
    )

    return list(db.scalars(stmt).all())

# 쿼리재작성용 최근 메시지 조회
def get_recent_chat_messages(
    db: Session,
    room_id: str,
    limit: int = 10,
) -> list[ChatMessage]:
    stmt = (
        select(ChatMessage)
        .where(ChatMessage.room_id == room_id)
        .order_by(ChatMessage.created_at.desc(), ChatMessage.id.desc())
        .limit(limit)
    )

    messages = list(db.scalars(stmt).all())

    return list(reversed(messages))

# '가장 최근약' 업데이트
def update_chat_room_last_medicine(
    db: Session,
    room_id: str,
    medicine_name: str,
    medicine_id: str | None = None,
):
    room = get_chat_room(db=db, room_id=room_id)

    if room is None:
        return None

    room.last_medicine_name = medicine_name
    room.last_medicine_id = medicine_id
    db.commit()
    db.refresh(room)

    return room
