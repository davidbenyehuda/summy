from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import get_current_user
from ..services.chat_history import clear_chat_history, load_chat_history, save_chat_history

router = APIRouter(prefix="/chat", tags=["chat"])


class ChatHistoryBody(BaseModel):
    messages: list[dict]
    analysis: dict | None = None
    documentTitle: str | None = None
    fileUrl: str | None = None
    isImageDocument: bool = False
    quizAnswers: dict = {}
    quizSubmitted: bool = False


@router.get("/history")
def get_chat_history(user=Depends(get_current_user)):
    return load_chat_history(user["id"], user["email"])


@router.put("/history")
def put_chat_history(body: ChatHistoryBody, user=Depends(get_current_user)):
    return save_chat_history(
        user["id"],
        user["email"],
        body.model_dump(),
    )


@router.delete("/history")
def delete_chat_history(user=Depends(get_current_user)):
    return clear_chat_history(user["id"], user["email"])
