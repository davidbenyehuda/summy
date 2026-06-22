import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..deps import get_current_user_id
from ..models import StudentProfile, SummaryHistory

router = APIRouter(prefix="/entities", tags=["entities"])


def _format_profile(profile: StudentProfile) -> dict:
    return {
        "id": str(profile.id),
        "user_id": str(profile.user_id),
        "full_name": profile.full_name,
        "grade": profile.grade,
        "subjects": profile.subjects or [],
        "learning_goal": profile.learning_goal,
        "onboarding_complete": profile.onboarding_complete,
        "created_date": profile.created_at.isoformat() if profile.created_at else None,
    }


def _format_summary(summary: SummaryHistory) -> dict:
    return {
        "id": str(summary.id),
        "user_id": str(summary.user_id),
        "file_name": summary.file_name,
        "file_url": summary.file_url,
        "title": summary.title,
        "summary_text": summary.summary_text,
        "created_date": summary.created_date.isoformat() if summary.created_date else None,
    }


@router.get("/student-profiles")
def list_student_profiles(
    user_id: str = Query(...),
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    profiles = db.scalars(
        select(StudentProfile)
        .where(StudentProfile.user_id == uuid.UUID(user_id))
        .order_by(StudentProfile.created_at.desc())
    ).all()
    return [_format_profile(profile) for profile in profiles]


@router.post("/student-profiles")
def create_student_profile(
    body: dict,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    user_id = body.get("user_id")
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    profile = StudentProfile(
        user_id=uuid.UUID(user_id),
        full_name=body.get("full_name"),
        grade=body.get("grade"),
        subjects=body.get("subjects") or [],
        learning_goal=body.get("learning_goal"),
        onboarding_complete=body.get("onboarding_complete", False),
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return _format_profile(profile)


@router.patch("/student-profiles/{profile_id}")
def update_student_profile(
    profile_id: str,
    body: dict,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    profile = db.get(StudentProfile, uuid.UUID(profile_id))
    if not profile or str(profile.user_id) != current_user_id:
        raise HTTPException(status_code=404, detail="Profile not found")

    if "full_name" in body:
        profile.full_name = body["full_name"]
    if "grade" in body:
        profile.grade = body["grade"]
    if "subjects" in body:
        profile.subjects = body["subjects"]
    if "learning_goal" in body:
        profile.learning_goal = body["learning_goal"]
    if "onboarding_complete" in body:
        profile.onboarding_complete = body["onboarding_complete"]
    profile.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(profile)
    return _format_profile(profile)


@router.get("/summary-history")
def list_summary_history(
    user_id: str = Query(...),
    limit: int = Query(50),
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    summaries = db.scalars(
        select(SummaryHistory)
        .where(SummaryHistory.user_id == uuid.UUID(user_id))
        .order_by(SummaryHistory.created_date.desc())
        .limit(limit)
    ).all()
    return [_format_summary(summary) for summary in summaries]


@router.post("/summary-history")
def create_summary_history(
    body: dict,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    user_id = body.get("user_id")
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    summary = SummaryHistory(
        user_id=uuid.UUID(user_id),
        file_name=body.get("file_name"),
        file_url=body.get("file_url"),
        title=body.get("title"),
        summary_text=body.get("summary_text"),
    )
    db.add(summary)
    db.commit()
    db.refresh(summary)
    return _format_summary(summary)


@router.delete("/summary-history/{summary_id}")
def delete_summary_history(
    summary_id: str,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    summary = db.get(SummaryHistory, uuid.UUID(summary_id))
    if not summary or str(summary.user_id) != current_user_id:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(summary)
    db.commit()
    return {"ok": True}
