from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel


class CharacterBase(BaseModel):
    name: str
    role: str = "supporting"
    description: Optional[str] = None


class CharacterCreate(CharacterBase):
    project_id: UUID


class CharacterUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    description: Optional[str] = None


class CharacterResponse(CharacterBase):
    id: UUID
    project_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CharacterRelationshipBase(BaseModel):
    source_id: UUID
    target_id: UUID
    relation_type: str
    description: Optional[str] = None


class CharacterRelationshipCreate(CharacterRelationshipBase):
    project_id: UUID


class CharacterRelationshipResponse(CharacterRelationshipBase):
    id: UUID
    project_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


class CharacterWithRelationshipsResponse(CharacterResponse):
    outgoing_relationships: List[CharacterRelationshipResponse] = []
