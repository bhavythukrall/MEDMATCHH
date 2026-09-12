"""Medical report upload routes."""
import uuid
import os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Response, Header, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_db
from models import User, Patient, MedicalReport
from schemas import MedicalReportOut
from auth import get_current_user, _extract_token
from storage import put_object, get_object, APP_NAME
import jwt

router = APIRouter(prefix="/uploads", tags=["uploads"])

MIME = {
    "jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "webp": "image/webp",
    "gif": "image/gif", "pdf": "application/pdf",
}


@router.post("/patients/{patient_id}/reports", response_model=MedicalReportOut)
async def upload_report(patient_id: str, file: UploadFile = File(...), db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    res = await db.execute(select(Patient).where(Patient.id == patient_id))
    if not res.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Patient not found")

    ext = (file.filename or "bin").rsplit(".", 1)[-1].lower()
    content_type = file.content_type or MIME.get(ext, "application/octet-stream")
    data = await file.read()
    if len(data) > 15 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large (max 15MB)")

    path = f"{APP_NAME}/reports/{patient_id}/{uuid.uuid4()}.{ext}"
    result = put_object(path, data, content_type)

    rec = MedicalReport(
        patient_id=patient_id,
        storage_path=result["path"],
        original_filename=file.filename or f"report.{ext}",
        content_type=content_type,
        size=result.get("size", len(data)),
        uploaded_by_user_id=user.id,
    )
    db.add(rec)
    await db.commit()
    await db.refresh(rec)
    return rec


@router.get("/patients/{patient_id}/reports", response_model=list[MedicalReportOut])
async def list_reports(patient_id: str, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    res = await db.execute(select(MedicalReport).where(MedicalReport.patient_id == patient_id).order_by(MedicalReport.created_at.desc()))
    return list(res.scalars().all())


@router.get("/reports/{report_id}/download")
async def download_report(report_id: str, auth: str | None = Query(None), authorization: str | None = Header(None), db: AsyncSession = Depends(get_db)):
    # Manual token check (img tags cannot send Authorization header)
    token = auth or (authorization[7:] if authorization and authorization.startswith("Bearer ") else None)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        jwt.decode(token, os.environ["JWT_SECRET"], algorithms=["HS256"])
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    res = await db.execute(select(MedicalReport).where(MedicalReport.id == report_id))
    r = res.scalar_one_or_none()
    if not r:
        raise HTTPException(status_code=404, detail="Report not found")
    data, content_type = get_object(r.storage_path)
    return Response(content=data, media_type=r.content_type or content_type)
