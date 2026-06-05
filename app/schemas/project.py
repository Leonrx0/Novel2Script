from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, Field


class ProjectBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None


class ProjectCreate(ProjectBase):
    novel_content: Optional[str] = None


class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    novel_content: Optional[str] = None
    script_content: Optional[str] = None


class ProjectResponse(ProjectBase):
    id: UUID
    generation_stage: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProjectDetailResponse(ProjectResponse):
    novel: Optional[dict] = None
    scripts: List[dict] = []
    characters: List[dict] = []
    rhythm_points: List[dict] = []
    generation_logs: List[dict] = []
    character_relationships: List[dict] = []


class GenerationStage(BaseModel):
    stage: str
    project_id: UUID
