import re
import time
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel

from ..config import ROOT, config
from ..deps import get_current_user_id

router = APIRouter(prefix="/integrations", tags=["integrations"])

uploads_dir = (ROOT / config["uploads"]["dir"]).resolve()
uploads_dir.mkdir(parents=True, exist_ok=True)

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


class ExtractBody(BaseModel):
    file_url: str | None = None


class LlmBody(BaseModel):
    prompt: str | None = None


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    _user_id: str = Depends(get_current_user_id),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded")

    safe_name = re.sub(r"[^a-zA-Z0-9._-]", "_", file.filename)
    filename = f"{int(time.time() * 1000)}-{safe_name}"
    destination = uploads_dir / filename
    content = await file.read()
    destination.write_bytes(content)
    return {"file_url": f"/uploads/{filename}"}


@router.post("/extract")
def extract_data(
    body: ExtractBody,
    _user_id: str = Depends(get_current_user_id),
):
    file_name = (body.file_url or "").split("/")[-1] or "document"
    title = re.sub(r"\.[^/.]+$", "", file_name)
    return {
        "status": "success",
        "output": {
            "sections": [
                {
                    "heading": f"1. סיכום: {title}",
                    "body": (
                        "מסמך זה עוסק בנושאי לימוד מרכזיים. התוכן הועלה בהצלחה "
                        "וניתן לעבור עליו בעזרת עוזר ה-AI בצד ימין."
                    ),
                },
                {
                    "heading": "2. נקודות עיקריות",
                    "body": (
                        "המסמך מכיל מושגים חשובים, הגדרות ודוגמאות. "
                        "השתמשו במונחים המסומנים לקבלת הסברים מותאמים."
                    ),
                },
                {
                    "heading": "3. המלצות ללמידה",
                    "body": (
                        "קראו את הסיכום, נסו את טאב המשחק, והשוו בין הסבר פשוט "
                        "לאנלוגיה כדי לחזק את ההבנה."
                    ),
                },
            ],
        },
    }


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
