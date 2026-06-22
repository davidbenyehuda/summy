import re
from pathlib import Path
import os
import shutil
import tempfile
import time
from google import genai
from google.genai import errors
from ..schemas.document_analysis import AnalysisSection, DocumentAnalysisOutput

#pip install google-genai os shutil tempfile time tkinter pathlib re
def analyze_document(*, filename: str, file_path: Path) -> DocumentAnalysisOutput:
    """Process an uploaded document and return structured analysis.

    Replace this stub with a real LLM call in a later commit.
    """
    title = re.sub(r"\.[^/.]+$", "", filename) or "document"
    file_size_kb = max(1, file_path.stat().st_size // 1024)


    SUPPORTED_EXTENSIONS = {
        ".pdf": "application/pdf",
        ".txt": "text/plain",
        ".csv": "text/csv",
        ".md": "text/plain",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
        ".mp3": "audio/mpeg",
        ".wav": "audio/wav",
        ".mp4": "video/mp4",
        ".mov": "video/quicktime",
    }

    api_key = r"AQ.Ab8RN6LQxP3GrDBGCLRLuItiVPsLGqEcCqr5Jpx0dAILQZVxeQ"

    client = genai.Client(api_key=api_key)
    temp_dir = tempfile.gettempdir()
    safe_path = os.path.join(temp_dir, "upload_temp" + ext)
    shutil.copyfile(file_path, safe_path)

    uploaded_file = client.files.upload(file=safe_path)
    os.remove(safe_path)
    prompt = "Analyze the content of this file and provide a structured summary, key insights, and suggestions for further research. Focus on extracting the most relevant information that would be useful for a student learning about the topic. If the file is an image or video, describe its content in detail. If it's audio, provide a transcript and summarize the main points. Organize the output into sections with clear headings."

    # --- Retry loop for generate_content (handles 503 / temporary overload) ---
    def generate_with_retry(max_wait=120, delay=5):
        elapsed = 0
        while True:
            try:
                return client.models.generate_content(
                    model='gemini-2.5-flash',
                    contents=[uploaded_file, prompt],
                )
            except errors.ServerError as e:
                print(f"Sami is busy ({e}). Retrying in {delay} seconds...")
                time.sleep(delay)
                elapsed += delay
                if elapsed >= max_wait:
                    print("Still unavailable after repeated retries, Please try again later.")
                    raise

    response = generate_with_retry()
    

    return DocumentAnalysisOutput(
        title=title,
        text_page=AnalysisSection(
            heading=f"עמוד טקסט — {title}",
            body=(
                response.text
            ),
        ),
        further_research=AnalysisSection(
            heading="מחקר נוסף",
            body=(
                response.text
            ),
        ),
        short_explanation=(
            f"סיכום קצר: \"{title}\" הוא מסמך לימודי שהועלה למערכת. "
            "בגרסה הנוכחית מוחזרת תשובת בדיקה — בעתיד תוחלף בניתוח AI מלא."
        ),
    )
