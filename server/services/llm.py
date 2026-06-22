import re
from pathlib import Path

from ..schemas.document_analysis import AnalysisSection, DocumentAnalysisOutput


def analyze_document(*, filename: str, file_path: Path) -> DocumentAnalysisOutput:
    """Process an uploaded document and return structured analysis.

    Replace this stub with a real LLM call in a later commit.
    """
    title = re.sub(r"\.[^/.]+$", "", filename) or "document"
    file_size_kb = max(1, file_path.stat().st_size // 1024)

    return DocumentAnalysisOutput(
        title=title,
        text_page=AnalysisSection(
            heading=f"עמוד טקסט — {title}",
            body=(
                f"הקובץ \"{filename}\" הועלה בהצלחה ({file_size_kb} KB). "
                "זהו תוכן הדגמה שיוחלף בתשובת LLM אמיתית בשלב הבא. "
                "כאן יוצג הטקסט המלא או הסיכום המפורט של המסמך, מחולק לפסקאות "
                "שניתן לקרוא ישירות בעמוד הלימוד."
            ),
        ),
        further_research=AnalysisSection(
            heading="מחקר נוסף",
            body=(
                "• חפשו מאמרים עדכניים בנושא המרכזי של המסמך\n"
                "• השוו בין הגישות השונות שמוזכרות בחומר\n"
                "• בדקו דוגמאות מעשיות או מקרי בוחן רלוונטיים\n"
                "• רשמו שאלות פתוחות להמשך למידה עצמאית"
            ),
        ),
        short_explanation=(
            f"סיכום קצר: \"{title}\" הוא מסמך לימודי שהועלה למערכת. "
            "בגרסה הנוכחית מוחזרת תשובת בדיקה — בעתיד תוחלף בניתוח AI מלא."
        ),
    )
