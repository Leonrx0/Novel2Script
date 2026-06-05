"""
    Character & CharacterRelationship 模型 — 人物与人物关系表
    ============================================================
    Character:          存储小说中提取的角色信息（名字、角色类型、描述）
    CharacterRelationship: 存储角色之间的关系（有向图: source → target）

    关系类型示例: 朋友 / 敌人 / 恋人 / 家人 / 师徒 / 上下级 等
    前端可用 ReactFlow 将此数据渲染为人物关系图。
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base


class Character(Base):
    """角色模型 — 存储从小说中提取的人物信息"""
    __tablename__ = "characters"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, comment="角色唯一ID")
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, comment="所属项目ID")
    name = Column(String(255), nullable=False, comment="角色名称")
    role = Column(String(50), default="supporting", comment="角色类型: protagonist / antagonist / supporting / other")
    description = Column(Text, nullable=True, comment="角色描述（AI 自动生成或用户编辑）")
    created_at = Column(DateTime, default=datetime.utcnow, comment="创建时间")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, comment="更新时间")

    project = relationship("Project", back_populates="characters")
    # 该角色作为"起点"的关系（outgoing）
    outgoing_relationships = relationship(
        "CharacterRelationship",
        foreign_keys="CharacterRelationship.source_id",
        back_populates="source_character",
        cascade="all, delete-orphan"
    )
    # 该角色作为"终点"的关系（incoming）
    incoming_relationships = relationship(
        "CharacterRelationship",
        foreign_keys="CharacterRelationship.target_id",
        back_populates="target_character"
    )


class CharacterRelationship(Base):
    """人物关系模型 — 有向关系图: source → target"""
    __tablename__ = "character_relationships"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, comment="关系唯一ID")
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, comment="所属项目ID")
    source_id = Column(UUID(as_uuid=True), ForeignKey("characters.id"), nullable=False, comment="关系起点角色ID")
    target_id = Column(UUID(as_uuid=True), ForeignKey("characters.id"), nullable=False, comment="关系终点角色ID")
    relation_type = Column(String(50), nullable=False, comment="关系类型: 朋友/敌人/恋人/家人/师徒 等")
    description = Column(Text, nullable=True, comment="关系详细描述")
    created_at = Column(DateTime, default=datetime.utcnow, comment="创建时间")

    project = relationship("Project", back_populates="character_relationships")
    source_character = relationship("Character", foreign_keys=[source_id], back_populates="outgoing_relationships")
    target_character = relationship("Character", foreign_keys=[target_id], back_populates="incoming_relationships")
