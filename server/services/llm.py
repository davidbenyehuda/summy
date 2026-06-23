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
    FurtherResearch,
    QuizQuestion,
    ResearchItem,
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
        research_items = _parse_research_response(research_response, max_items=3)

        return _build_analysis_output(
            title,
            analysis_text,
            file_size_kb,
            research_items=research_items,
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

    for match in re.finditer(
        r"<item>\s*(.*?)\s*</item>",
        quiz_text,
        re.DOTALL | re.IGNORECASE,
    ):
        block = match.group(1)
        question = _extract_tag(block, "question")
        options = [
            option.strip()
            for option in re.findall(
                r"<option>\s*(.*?)\s*</option>",
                block,
                re.DOTALL | re.IGNORECASE,
            )
            if option.strip()
        ]
        correct_raw = _extract_tag(block, "correct")
        try:
            correct = int(correct_raw.strip()) if correct_raw else 0
        except ValueError:
            correct = 0

        if question and len(options) >= 4:
            questions.append(
                QuizQuestion(
                    question=question,
                    options=options[:4],
                    correct=max(0, min(3, correct)),
                )
            )

    return questions


def _resolve_quiz(quiz_text: str, fallback: list | None = None) -> list[QuizQuestion]:
    if quiz_text.strip():
        parsed = _parse_quiz_questions(quiz_text)
        if _is_valid_quiz(parsed):
            return parsed
    if fallback:
        try:
            restored = [QuizQuestion(**item) for item in fallback]
            if _is_valid_quiz(restored):
                return restored
        except Exception:
            pass
    return []


def _is_valid_quiz(questions: list[QuizQuestion]) -> bool:
    return len(questions) >= 4 and all(len(question.options) == 4 for question in questions)


def _grounding_items_from_metadata(response, *, is_new: bool = False) -> list[ResearchItem]:
    items: list[ResearchItem] = []
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
            items.append(
                ResearchItem(
                    title=site_title,
                    text="מקור שנמצא בחיפוש באינטרנט.",
                    url=uri,
                    is_new=is_new,
                )
            )

    return items


def _parse_research_response(
    response,
    *,
    is_new: bool = False,
    max_items: int | None = None,
) -> list[ResearchItem]:
    response_text = response.text or ""
    items: list[ResearchItem] = []

    research_block = _extract_tag(response_text, "research")
    if research_block:
        for match in re.finditer(
            r"<item>\s*(.*?)\s*</item>",
            research_block,
            re.DOTALL | re.IGNORECASE,
        ):
            block = match.group(1)
            title = _extract_tag(block, "title")
            text = _extract_tag(block, "text")
            url = _extract_tag(block, "url")
            concept = _extract_tag(block, "concept")
            if title or text or url:
                items.append(
                    ResearchItem(
                        title=title or "מקור",
                        text=text or "מקור רלוונטי לנושא.",
                        url=url,
                        concept=concept,
                        is_new=is_new,
                    )
                )

    grounding_items = _grounding_items_from_metadata(response, is_new=is_new)

    if not items:
        merged = grounding_items
    else:
        merged: list[ResearchItem] = []
        for index, item in enumerate(items):
            url = item.url
            if not url and index < len(grounding_items):
                url = grounding_items[index].url
            if not url:
                for grounding in grounding_items:
                    if grounding.title.lower() == item.title.lower():
                        url = grounding.url
                        break
            merged.append(
                ResearchItem(
                    title=item.title,
                    text=item.text,
                    url=url,
                    concept=item.concept,
                    is_new=item.is_new,
                )
            )

        used_urls = {item.url for item in merged if item.url}
        for grounding in grounding_items:
            if grounding.url not in used_urls:
                merged.append(grounding)

    if max_items is not None:
        return merged[:max_items]
    return merged


def _merge_research_items(
    existing: list[dict],
    new_items: list[ResearchItem],
) -> list[dict]:
    result: list[dict] = []
    seen_urls: set[str] = set()

    for item in existing:
        normalized = dict(item)
        normalized.setdefault("concept", "")
        normalized.setdefault("is_new", False)
        result.append(normalized)
        if normalized.get("url"):
            seen_urls.add(normalized["url"])

    for item in new_items:
        if item.url and item.url in seen_urls:
            continue
        result.append(item.model_dump())
        if item.url:
            seen_urls.add(item.url)

    return result


def _fetch_follow_up_research(
    client,
    *,
    gemini_file,
    llm: dict,
    user_prompt: str,
    existing_items: list[dict],
) -> list[ResearchItem]:
    chat_research_prompt = llm.get("chat_research_prompt", "").strip()
    if not chat_research_prompt:
        return []

    concepts: list[str] = []
    for item in existing_items:
        label = (item.get("concept") or item.get("title") or "").strip()
        if label:
            concepts.append(label)

    existing_str = "\n".join(f"- {concept}" for concept in concepts) or "אין עדיין"

    research_prompt = (
        chat_research_prompt.replace("{topic}", user_prompt).replace("{existing}", existing_str)
    )

    response = _generate_research_with_search(
        client,
        gemini_file,
        research_prompt,
        model=llm["model"],
        max_wait=llm["max_wait_seconds"],
        delay=llm["retry_delay_seconds"],
    )
    return _parse_research_response(response, is_new=True, max_items=2)


def _build_analysis_output(
    title: str,
    response_text: str,
    file_size_kb: int,
    *,
    research_items: list[ResearchItem],
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
        further_research=FurtherResearch(
            heading="מחקר נוסף",
            items=research_items,
        ),
        short_explanation=abstract or "לא נמצא סיכום.",
        quiz=_resolve_quiz(quiz_text),
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
    contents = [uploaded_file, prompt] if uploaded_file is not None else [prompt]
    return _generate_contents_with_retry(
        client,
        contents,
        model=model,
        max_wait=max_wait,
        delay=delay,
        config=config,
    )


def _generate_contents_with_retry(
    client,
    contents,
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
                "contents": contents,
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


def _format_analysis_context(analysis: dict | None) -> str:
    if not analysis:
        return "אין ניתוח מסמך זמין."

    parts: list[str] = []
    if analysis.get("title"):
        parts.append(f"כותרת: {analysis['title']}")

    text_page = analysis.get("text_page") or {}
    if text_page.get("body"):
        heading = text_page.get("heading", "ניתוח")
        parts.append(f"{heading}\n{text_page['body']}")

    if analysis.get("short_explanation"):
        parts.append(f"תקציר: {analysis['short_explanation']}")

    research = analysis.get("further_research") or {}
    items = research.get("items") or []
    if items:
        research_lines = []
        for item in items:
            concept = item.get("concept", "")
            prefix = f"[{concept}] " if concept else ""
            research_lines.append(
                f"- {prefix}{item.get('title', 'מקור')}: {item.get('text', '')}"
            )
        parts.append("מחקר נוסף:\n" + "\n".join(research_lines))

    quiz = analysis.get("quiz") or []
    if quiz:
        quiz_lines = [f"- {item.get('question', '')}" for item in quiz if item.get("question")]
        parts.append("שאלות בחן:\n" + "\n".join(quiz_lines))

    return "\n\n".join(parts) if parts else "אין ניתוח מסמך זמין."


def _format_conversation(messages: list[dict]) -> str:
    lines: list[str] = []
    for message in messages:
        role = message.get("role")
        if message.get("type") == "image":
            lines.append("משתמש: [העלה תמונה/מסמך]")
            continue
        content = (message.get("content") or "").strip()
        if not content:
            continue
        speaker = "משתמש" if role == "user" else "עוזר"
        lines.append(f"{speaker}: {content}")
    return "\n".join(lines) if lines else "אין הודעות קודמות."


def _build_chat_prompt(
    chat_prompt: str,
    analysis: dict | None,
    messages: list[dict],
) -> str:
    return (
        f"{chat_prompt}\n\n"
        f"## Previous tab state (preserve and build on this)\n"
        f"{_format_analysis_context(analysis)}\n\n"
        f"## Full conversation history\n{_format_conversation(messages)}\n\n"
        "Recalculate the tabs based on the user's latest message. "
        "Append new insights to the previous state where relevant."
    )


def _normalize_response_text(text: str) -> str:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:xml|markdown)?\s*", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    return cleaned.strip()


def _append_chat_insight(existing_body: str, user_prompt: str, chat_reply: str) -> str:
    section = (
        f"### עדכון מהשיחה\n\n"
        f"**שאלה:** {user_prompt}\n\n"
        f"**תשובה:** {chat_reply}"
    )
    if section.strip() in existing_body:
        return existing_body
    if existing_body.strip():
        return f"{existing_body.rstrip()}\n\n---\n\n{section}"
    return section


def _merge_analysis_update(
    existing: dict | None,
    *,
    title: str,
    analysis_body: str,
    abstract: str,
    quiz_text: str,
) -> dict:
    base = existing or {}
    text_page = base.get("text_page") or {}
    further_research = base.get("further_research") or {
        "heading": "מחקר נוסף",
        "items": [],
    }

    quiz = [question.model_dump() for question in _resolve_quiz(quiz_text, base.get("quiz"))]

    return {
        "title": base.get("title") or title,
        "text_page": {
            "heading": text_page.get("heading") or f"ניתוח — {title}",
            "body": analysis_body or text_page.get("body", ""),
        },
        "further_research": further_research,
        "short_explanation": abstract or base.get("short_explanation", ""),
        "quiz": quiz,
    }


def invoke_chat(
    *,
    prompt: str,
    messages: list[dict],
    analysis: dict | None = None,
    upload: InMemoryUpload | None = None,
    document_title: str | None = None,
) -> dict:
    """Send full context to Gemini and return chat reply plus refreshed tab content."""
    if not prompt.strip():
        raise ValueError("Prompt is required")

    llm = get_llm_config()
    client = genai.Client(api_key=llm["api_key"])
    title = document_title or (analysis or {}).get("title") or "document"

    gemini_file = None
    temp_path = None

    try:
        contents: list = []
        if upload is not None:
            temp_dir = os.path.join(tempfile.gettempdir(), "upload_temp")
            os.makedirs(temp_dir, exist_ok=True)
            safe_name = upload.filename.replace(" ", "-")
            temp_path = os.path.join(temp_dir, safe_name)
            with open(temp_path, "wb") as tmp:
                tmp.write(upload.data)
            gemini_file = client.files.upload(file=temp_path)
            contents.append(gemini_file)

        contents.append(
            _build_chat_prompt(
                llm["chat_prompt"],
                analysis,
                messages,
            )
        )

        response = _generate_contents_with_retry(
            client,
            contents,
            model=llm["model"],
            max_wait=llm["max_wait_seconds"],
            delay=llm["retry_delay_seconds"],
        )
        response_text = _normalize_response_text(response.text or "")

        chat_reply = _extract_tag(response_text, "chat_reply")
        analysis_body = _extract_tag(response_text, "analysis")
        abstract = _extract_tag(response_text, "abstract")
        quiz_text = _extract_tag(response_text, "quiz")

        if not chat_reply and not any((analysis_body, abstract, quiz_text)):
            chat_reply = response_text

        if not chat_reply:
            chat_reply = "לא הצלחתי ליצור תשובה."

        if analysis_body or abstract or quiz_text:
            updated_analysis = _merge_analysis_update(
                analysis,
                title=title,
                analysis_body=analysis_body,
                abstract=abstract,
                quiz_text=quiz_text,
            )
        elif analysis:
            updated_analysis = _merge_analysis_update(
                analysis,
                title=title,
                analysis_body=_append_chat_insight(
                    (analysis.get("text_page") or {}).get("body", ""),
                    prompt,
                    chat_reply,
                ),
                abstract=chat_reply,
                quiz_text="",
            )
        else:
            updated_analysis = None

        if updated_analysis:
            existing_items = (updated_analysis.get("further_research") or {}).get("items") or []
            new_research = _fetch_follow_up_research(
                client,
                gemini_file=gemini_file,
                llm=llm,
                user_prompt=prompt,
                existing_items=existing_items,
            )
            if new_research:
                merged_items = _merge_research_items(existing_items, new_research)
                further = updated_analysis.get("further_research") or {}
                updated_analysis["further_research"] = {
                    "heading": further.get("heading") or "מחקר נוסף",
                    "items": merged_items,
                }

        return {
            "reply": chat_reply,
            "analysis": updated_analysis,
        }
    finally:
        if gemini_file is not None:
            try:
                client.files.delete(name=gemini_file.name)
            except Exception:
                pass
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)
        if upload is not None:
            upload.clear()
