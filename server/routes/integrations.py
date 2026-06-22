import json
import re
import time
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel

from ..config import ROOT, config
from ..deps import get_current_user_id
from ..schemas.document_analysis import AnalyzeDocumentResponse
from ..schemas.uploaded_file import InMemoryUpload
from ..services.llm import analyze_document

router = APIRouter(prefix="/integrations", tags=["integrations"])

uploads_dir = (ROOT / config["uploads"]["dir"]).resolve()
uploads_dir.mkdir(parents=True, exist_ok=True)
results_dir = uploads_dir / "results"
results_dir.mkdir(parents=True, exist_ok=True)

GLOSSARY = {
    "גלוקוז": "גלוקוז הוא סוכר פשוט שהצמח מייצר בפוטוסינתזה ומשמש כמקור האנרגיה העיקרי לצמיחה.",
    "חמצן": "חמצן הוא גז שמשתחרר כתוצר לוואי של פיצול מולקולות המים בתגובות האור.",
    "כלורופיל": "כלורופיל הוא הפיגמנט הירוק שסופג אור שמש ומאפשר לצמח להתחיל את תהליך הפוטוסינתזה.",
    "ATP": "ATP הוא מולקולה שמאחסנת אנרגיה זמנית שהצמח משתמש בה לבניית גלוקוז.",
    "NADPH": "NADPH מספק אלקטרונים ואנרגיה לשלב קיבוע הפחמן במחזור קלווין.",
    "מחזור קלווין": "מחזור קלווין הוא סדרת תגובות כימיות שבהן CO₂ מומר לגלוקוז בעזרת ATP ו-NADPH.",
    "סטרומה": "הסטרומה היא הנוזל שבתוך הכלורופלסט שבו מתרחש מחזור קלווין.",
    "כלורופלסט": "כלורופלסט הוא אברון בתוך תא הצמח שבו מתרחשת הפוטוסינתזה.",
}


class LlmBody(BaseModel):
    prompt: str | None = None


def _safe_filename(name: str) -> str:
    return re.sub(r"[^a-zA-Z0-9._-]", "_", name)


def _save_analysis_result(
    *,
    user_id: str,
    file_url: str,
    output,
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


@router.post("/analyze", response_model=AnalyzeDocumentResponse)
async def analyze_uploaded_document(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded")

    raw_content = await file.read()
    in_memory = InMemoryUpload(
        filename=file.filename,
        data=raw_content,
        content_type=file.content_type,
    )

    try:
        safe_name = _safe_filename(file.filename)
        stored_name = f"{int(time.time() * 1000)}-{safe_name}"
        destination = uploads_dir / stored_name
        destination.write_bytes(in_memory.data)
        file_url = f"/uploads/{stored_name}"

        output = analyze_document(upload=in_memory)
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
        del raw_content


@router.post("/llm")
def invoke_llm(
    body: LlmBody,
    _user_id: str = Depends(get_current_user_id),
):
    prompt = body.prompt or ""
    term_match = re.search(r'term "([^"]+)"', prompt, re.IGNORECASE)
    term = term_match.group(1) if term_match else None

    if term and term in GLOSSARY:
        return GLOSSARY[term]

    if term:
        return (
            f"{term} הוא מושג מרכזי בביולוגיה של הצמחים. בפוטוסינתזה, מושגים כמו "
            f"{term} עוזרים להבין איך אור הופך לאנרגיה כימית."
        )

    return "הסבר קצר: פוטוסינתזה היא תהליך שבו צמחים ממירים אור, מים ו-CO₂ לגלוקוז וחמצן."
