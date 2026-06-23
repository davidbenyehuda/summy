import json
import re
import time
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel

from ..config import ROOT, config
from ..deps import get_current_user_id
from ..schemas.document_analysis import AnalyzeDocumentResponse, DocumentAnalysisOutput
from ..schemas.uploaded_file import InMemoryUpload
from ..services.llm import analyze_document, invoke_chat

router = APIRouter(prefix="/integrations", tags=["integrations"])

uploads_dir = (ROOT / config["uploads"]["dir"]).resolve()
uploads_dir.mkdir(parents=True, exist_ok=True)
results_dir = uploads_dir / "results"
results_dir.mkdir(parents=True, exist_ok=True)

class ChatMessage(BaseModel):
    role: str
    content: str | None = None
    type: str | None = None
    imageUrl: str | None = None


class LlmBody(BaseModel):
    prompt: str
    messages: list[ChatMessage] = []
    analysis: dict | None = None
    file_url: str | None = None
    document_title: str | None = None


class ExtractBody(BaseModel):
    file_url: str


class UploadResponse(BaseModel):
    status: str = "success"
    file_url: str
    title: str


def _safe_filename(name: str) -> str:
    return re.sub(r"[^a-zA-Z0-9._-]", "_", name)


def _user_files_dir(user_id: str) -> Path:
    path = uploads_dir / user_id / "files"
    path.mkdir(parents=True, exist_ok=True)
    return path


def _title_from_filename(filename: str) -> str:
    return re.sub(r"\.[^/.]+$", "", filename) or "document"


def _resolve_user_file(user_id: str, file_url: str) -> Path:
    prefix = f"/uploads/{user_id}/files/"
    if not file_url.startswith(prefix):
        raise HTTPException(status_code=400, detail="Invalid file_url for this user")

    relative = file_url[len("/uploads/") :]
    file_path = (uploads_dir / relative).resolve()

    if not str(file_path).startswith(str(_user_files_dir(user_id).resolve())):
        raise HTTPException(status_code=400, detail="Invalid file path")

    if not file_path.is_file():
        raise HTTPException(status_code=404, detail="Uploaded file not found")

    return file_path


def _save_uploaded_file(*, user_id: str, filename: str, data: bytes) -> tuple[str, str]:
    safe_name = _safe_filename(filename)
    stored_name = f"{int(time.time() * 1000)}-{safe_name}"
    destination = _user_files_dir(user_id) / stored_name
    destination.write_bytes(data)
    file_url = f"/uploads/{user_id}/files/{stored_name}"
    return file_url, _title_from_filename(filename)


def _save_analysis_result(
    *,
    user_id: str,
    file_url: str,
    output: DocumentAnalysisOutput,
) -> str:
    user_results_dir = results_dir / user_id
    user_results_dir.mkdir(parents=True, exist_ok=True)
    result_name = f"{int(time.time() * 1000)}-{_safe_filename(output.title)}.json"
    result_path = user_results_dir / result_name
    payload = {
        "title": output.title,
        "file_url": file_url,
        "output": output.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    result_path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return f"/uploads/results/{user_id}/{result_name}"


def _extract_from_path(*, user_id: str, file_path: Path, file_url: str) -> AnalyzeDocumentResponse:
    in_memory = InMemoryUpload(
        filename=file_path.name,
        data=file_path.read_bytes(),
        content_type=None,
    )

    try:
        try:
            output = analyze_document(upload=in_memory)
        except RuntimeError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc

        result_url = _save_analysis_result(
            user_id=user_id,
            file_url=file_url,
            output=output,
        )

        return AnalyzeDocumentResponse(
            file_url=file_url,
            result_url=result_url,
            title=output.title,
            output=output,
        )
    finally:
        in_memory.clear()


@router.post("/upload", response_model=UploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded")

    raw_content = await file.read()
    try:
        file_url, title = _save_uploaded_file(
            user_id=user_id,
            filename=file.filename,
            data=raw_content,
        )
        return UploadResponse(file_url=file_url, title=title)
    finally:
        del raw_content


@router.post("/extract", response_model=AnalyzeDocumentResponse)
def extract_document(
    body: ExtractBody,
    user_id: str = Depends(get_current_user_id),
):
    file_path = _resolve_user_file(user_id, body.file_url)
    return _extract_from_path(user_id=user_id, file_path=file_path, file_url=body.file_url)


@router.post("/analyze", response_model=AnalyzeDocumentResponse)
async def analyze_uploaded_document(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded")

    raw_content = await file.read()
    try:
        file_url, _title = _save_uploaded_file(
            user_id=user_id,
            filename=file.filename,
            data=raw_content,
        )
        file_path = _resolve_user_file(user_id, file_url)
        return _extract_from_path(user_id=user_id, file_path=file_path, file_url=file_url)
    finally:
        del raw_content


@router.post("/llm")
def invoke_llm(
    body: LlmBody,
    user_id: str = Depends(get_current_user_id),
):
    upload = None
    if body.file_url:
        try:
            file_path = _resolve_user_file(user_id, body.file_url)
            upload = InMemoryUpload(
                filename=file_path.name,
                data=file_path.read_bytes(),
            )
        except HTTPException:
            raise
        except OSError as exc:
            raise HTTPException(status_code=404, detail="Uploaded file not found") from exc

    try:
        return invoke_chat(
            prompt=body.prompt,
            messages=[message.model_dump() for message in body.messages],
            analysis=body.analysis,
            upload=upload,
            document_title=body.document_title,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
