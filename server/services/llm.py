import os
import re
import tempfile
import time

from google import genai
from google.genai import errors

from ..config import get_llm_config
from ..schemas.document_analysis import AnalysisSection, DocumentAnalysisOutput
from ..schemas.uploaded_file import InMemoryUpload


def analyze_document(*, upload: InMemoryUpload) -> DocumentAnalysisOutput:
    """Process an in-memory uploaded document and return structured analysis."""
    llm = get_llm_config()
    filename = upload.filename
    title = re.sub(r"\.[^/.]+$", "", filename) or "document"
    file_size_kb = max(1, upload.size_bytes // 1024)

    client = genai.Client(api_key=llm["api_key"])

    temp_dir = os.path.join(tempfile.gettempdir(), "upload_temp")
    os.makedirs(temp_dir, exist_ok=True)
    safe_name = filename.replace(" ", "-")
    temp_path = os.path.join(temp_dir, safe_name)
    gemini_file = None

    try:
        with open(temp_path, "wb") as tmp:
            tmp.write(upload.data)

        gemini_file = client.files.upload(file=temp_path)
        response = _generate_with_retry(
            client,
            gemini_file,
            llm["analyze_prompt"],
            model=llm["model"],
            max_wait=llm["max_wait_seconds"],
            delay=llm["retry_delay_seconds"],
        )
        response_text = response.text or ""

        return DocumentAnalysisOutput(
            title=title,
            text_page=AnalysisSection(
                heading=f"עמוד טקסט — {title}",
                body=response_text,
            ),
            further_research=AnalysisSection(
                heading="מחקר נוסף",
                body=response_text,
            ),
            short_explanation=(
                f"סיכום קצר: \"{title}\" ({file_size_kb} KB) — "
                f"{response_text[:300]}{'...' if len(response_text) > 300 else ''}"
            ),
        )
    finally:
        if gemini_file is not None:
            try:
                client.files.delete(name=gemini_file.name)
            except Exception:
                pass
        if os.path.exists(temp_path):
            os.remove(temp_path)


def _generate_with_retry(client, uploaded_file, prompt, *, model, max_wait, delay):
    elapsed = 0
    while True:
        try:
            return client.models.generate_content(
                model=model,
                contents=[uploaded_file, prompt],
            )
        except errors.ServerError as e:
            print(f"Sami is busy ({e}). Retrying in {delay} seconds...")
            time.sleep(delay)
            elapsed += delay
            if elapsed >= max_wait:
                print("Still unavailable after repeated retries. Please try again later.")
                raise
