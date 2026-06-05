from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel


class ScriptBase(BaseModel):
    content: Optional[str] = None
    version: int = 1


class ScriptCreate(ScriptBase):
    project_id: UUID


class ScriptUpdate(BaseModel):
    content: Optional[str] = None


class ScriptResponse(ScriptBase):
    id: UUID
    project_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
