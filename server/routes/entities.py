import json

from fastapi import APIRouter, Depends, HTTPException, Query

from ..db import query
from ..deps import get_current_user_id

router = APIRouter(prefix="/entities", tags=["entities"])


def _format_profile(row: dict) -> dict:
    subjects = row["subjects"]
    if isinstance(subjects, str):
        subjects = json.loads(subjects)
    return {
        "id": str(row["id"]),
        "user_id": str(row["user_id"]),
        "full_name": row["full_name"],
        "grade": row["grade"],
        "subjects": subjects,
        "learning_goal": row["learning_goal"],
        "onboarding_complete": row["onboarding_complete"],
        "created_date": row["created_at"].isoformat() if row["created_at"] else None,
    }


def _format_summary(row: dict) -> dict:
    return {
        "id": str(row["id"]),
        "user_id": str(row["user_id"]),
        "file_name": row["file_name"],
        "file_url": row["file_url"],
        "title": row["title"],
        "summary_text": row["summary_text"],
        "created_date": row["created_date"].isoformat() if row["created_date"] else None,
    }


@router.get("/student-profiles")
def list_student_profiles(
    user_id: str = Query(...),
    current_user_id: str = Depends(get_current_user_id),
):
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    rows = query(
        "SELECT * FROM student_profiles WHERE user_id = %s ORDER BY created_at DESC",
        [user_id],
    )
    return [_format_profile(row) for row in rows]


@router.post("/student-profiles")
def create_student_profile(
    body: dict,
    current_user_id: str = Depends(get_current_user_id),
):
    user_id = body.get("user_id")
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    subjects = body.get("subjects") or []
    rows = query(
        """INSERT INTO student_profiles
           (user_id, full_name, grade, subjects, learning_goal, onboarding_complete)
           VALUES (%s, %s, %s, %s, %s, %s) RETURNING *""",
        [
            user_id,
            body.get("full_name"),
            body.get("grade"),
            json.dumps(subjects),
            body.get("learning_goal"),
            body.get("onboarding_complete", False),
        ],
    )
    return _format_profile(rows[0])


@router.patch("/student-profiles/{profile_id}")
def update_student_profile(
    profile_id: str,
    body: dict,
    current_user_id: str = Depends(get_current_user_id),
):
    existing = query("SELECT * FROM student_profiles WHERE id = %s", [profile_id])
    if not existing or str(existing[0]["user_id"]) != current_user_id:
        raise HTTPException(status_code=404, detail="Profile not found")

    subjects = body.get("subjects")
    rows = query(
        """UPDATE student_profiles SET
             full_name = COALESCE(%s, full_name),
             grade = COALESCE(%s, grade),
             subjects = COALESCE(%s, subjects),
             learning_goal = COALESCE(%s, learning_goal),
             onboarding_complete = COALESCE(%s, onboarding_complete),
             updated_at = NOW()
           WHERE id = %s RETURNING *""",
        [
            body.get("full_name"),
            body.get("grade"),
            json.dumps(subjects) if subjects is not None else None,
            body.get("learning_goal"),
            body.get("onboarding_complete"),
            profile_id,
        ],
    )
    return _format_profile(rows[0])


@router.get("/summary-history")
def list_summary_history(
    user_id: str = Query(...),
    limit: int = Query(50),
    current_user_id: str = Depends(get_current_user_id),
):
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    rows = query(
        """SELECT * FROM summary_history
           WHERE user_id = %s ORDER BY created_date DESC LIMIT %s""",
        [user_id, limit],
    )
    return [_format_summary(row) for row in rows]


@router.post("/summary-history")
def create_summary_history(
    body: dict,
    current_user_id: str = Depends(get_current_user_id),
):
    user_id = body.get("user_id")
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    rows = query(
        """INSERT INTO summary_history (user_id, file_name, file_url, title, summary_text)
           VALUES (%s, %s, %s, %s, %s) RETURNING *""",
        [
            user_id,
            body.get("file_name"),
            body.get("file_url"),
            body.get("title"),
            body.get("summary_text"),
        ],
    )
    return _format_summary(rows[0])


@router.delete("/summary-history/{summary_id}")
def delete_summary_history(
    summary_id: str,
    current_user_id: str = Depends(get_current_user_id),
):
    existing = query("SELECT * FROM summary_history WHERE id = %s", [summary_id])
    if not existing or str(existing[0]["user_id"]) != current_user_id:
        raise HTTPException(status_code=404, detail="Not found")
    query("DELETE FROM summary_history WHERE id = %s", [summary_id])
    return {"ok": True}
