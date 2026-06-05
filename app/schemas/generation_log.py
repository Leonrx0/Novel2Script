from datetime import datetime
from typing import Optional, Any
from uuid import UUID
from pydantic import BaseModel


class GenerationLogBase(BaseModel):
    stage: str
    status: str = "pending"
    result: Optional[Any] = None


class GenerationLogCreate(GenerationLogBase):
    project_id: UUID


class GenerationLogResponse(GenerationLogBase):
    id: UUID
    project_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True
