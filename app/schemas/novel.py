from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel


class NovelBase(BaseModel):
    content: Optional[str] = None


class NovelCreate(NovelBase):
    project_id: UUID


class NovelUpdate(NovelBase):
    pass


class NovelResponse(NovelBase):
    id: UUID
    project_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True
