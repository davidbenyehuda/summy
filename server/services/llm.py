import os
import re
import tempfile
import time

from google import genai
from google.genai import errors

from ..config import get_llm_config
from ..schemas.document_analysis import (
    AnalysisSection,
    DocumentAnalysisOutput,
    QuizQuestion,
)
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
        return _build_analysis_output(title, response_text, file_size_kb)
    finally:
        if gemini_file is not None:
            try:
                client.files.delete(name=gemini_file.name)
            except Exception:
                pass
        if os.path.exists(temp_path):
            os.remove(temp_path)


def _extract_tag(text: str, tag: str) -> str:
    pattern = rf"<{tag}>\s*(.*?)\s*</{tag}>"
    match = re.search(pattern, text, re.DOTALL | re.IGNORECASE)
    return match.group(1).strip() if match else ""


def _parse_quiz_questions(quiz_text: str) -> list[QuizQuestion]:
    if not quiz_text.strip():
        return []

    questions: list[QuizQuestion] = []
    for part in re.split(r"(?=\d+\.\s)", quiz_text.strip()):
        part = part.strip()
        if not part:
            continue
        question = re.sub(r"^\d+\.\s*", "", part).strip()
        if question:
            questions.append(QuizQuestion(question=question))
    return questions


def _build_analysis_output(
    title: str,
    response_text: str,
    file_size_kb: int,
) -> DocumentAnalysisOutput:
    analysis_body = _extract_tag(response_text, "analysis")
    abstract = _extract_tag(response_text, "abstract")
    research_body = _extract_tag(response_text, "research")
    quiz_text = _extract_tag(response_text, "quiz")

    if not any((analysis_body, abstract, research_body, quiz_text)):
        analysis_body = response_text.strip()

    if not abstract and analysis_body:
        abstract = (
            f"{analysis_body[:300]}..."
            if len(analysis_body) > 300
            else analysis_body
        )

    return DocumentAnalysisOutput(
        title=title,
        text_page=AnalysisSection(
            heading=f"ניתוח — {title}",
            body=analysis_body or f"לא ניתן לחלץ ניתוח עבור \"{title}\" ({file_size_kb} KB).",
        ),
        further_research=AnalysisSection(
            heading="מחקר נוסף",
            body=research_body or "לא נמצאו נושאים להעמקה.",
        ),
        short_explanation=abstract or "לא נמצא סיכום.",
        quiz=_parse_quiz_questions(quiz_text),
    )


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
