import os
import re
import tempfile
import time

from google import genai
from google.genai import errors, types

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

        analysis_response = _generate_with_retry(
            client,
            gemini_file,
            llm["analyze_prompt"],
            model=llm["model"],
            max_wait=llm["max_wait_seconds"],
            delay=llm["retry_delay_seconds"],
        )
        analysis_text = analysis_response.text or ""

        research_topic = (
            f"the uploaded file \"{filename}\" — analyze its content and use its "
            "main subject as the search topic"
        )
        research_prompt = llm["research_prompt"].replace("{topic}", research_topic)
        research_response = _generate_research_with_search(
            client,
            gemini_file,
            research_prompt,
            model=llm["model"],
            max_wait=llm["max_wait_seconds"],
            delay=llm["retry_delay_seconds"],
        )
        research_body = _format_research_response(research_response)

        return _build_analysis_output(
            title,
            analysis_text,
            file_size_kb,
            research_body=research_body,
        )
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


def _format_research_response(response) -> str:
    body = (response.text or "").strip()
    sources = _extract_grounding_sources(response)
    if sources:
        body = f"{body}\n\n---\nמקורות:\n{sources}" if body else f"מקורות:\n{sources}"
    return body or "לא נמצאו תוצאות חיפוש."


def _extract_grounding_sources(response) -> str:
    lines: list[str] = []
    seen: set[str] = set()

    for candidate in getattr(response, "candidates", None) or []:
        metadata = getattr(candidate, "grounding_metadata", None)
        if not metadata:
            continue

        for chunk in getattr(metadata, "grounding_chunks", None) or []:
            web = getattr(chunk, "web", None)
            if not web:
                continue
            uri = getattr(web, "uri", None)
            if not uri or uri in seen:
                continue
            seen.add(uri)
            site_title = getattr(web, "title", None) or uri
            lines.append(f"- {site_title}: {uri}")

    return "\n".join(lines)


def _build_analysis_output(
    title: str,
    response_text: str,
    file_size_kb: int,
    *,
    research_body: str,
) -> DocumentAnalysisOutput:
    analysis_body = _extract_tag(response_text, "analysis")
    abstract = _extract_tag(response_text, "abstract")
    quiz_text = _extract_tag(response_text, "quiz")

    if not any((analysis_body, abstract, quiz_text)):
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
            body=research_body,
        ),
        short_explanation=abstract or "לא נמצא סיכום.",
        quiz=_parse_quiz_questions(quiz_text),
    )


def _generate_research_with_search(
    client,
    uploaded_file,
    prompt,
    *,
    model,
    max_wait,
    delay,
):
    config = types.GenerateContentConfig(
        tools=[types.Tool(google_search=types.GoogleSearch())],
    )
    return _generate_with_retry(
        client,
        uploaded_file,
        prompt,
        model=model,
        max_wait=max_wait,
        delay=delay,
        config=config,
    )


def _generate_with_retry(
    client,
    uploaded_file,
    prompt,
    *,
    model,
    max_wait,
    delay,
    config=None,
):
    elapsed = 0
    while True:
        try:
            kwargs = {
                "model": model,
                "contents": [uploaded_file, prompt],
            }
            if config is not None:
                kwargs["config"] = config
            return client.models.generate_content(**kwargs)
        except errors.ServerError as e:
            print(f"Sami is busy ({e}). Retrying in {delay} seconds...")
            time.sleep(delay)
            elapsed += delay
            if elapsed >= max_wait:
                print("Still unavailable after repeated retries. Please try again later.")
                raise
