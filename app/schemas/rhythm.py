from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel


class RhythmPointBase(BaseModel):
    position: float
    intensity: int
    label: str
    description: Optional[str] = None


class RhythmPointCreate(RhythmPointBase):
    project_id: UUID


class RhythmPointUpdate(BaseModel):
    position: Optional[float] = None
    intensity: Optional[int] = None
    label: Optional[str] = None
    description: Optional[str] = None


class RhythmPointResponse(RhythmPointBase):
    id: UUID
    project_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True
