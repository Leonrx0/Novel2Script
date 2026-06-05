"""
    Project 模型 — 项目主表
    ======================
    一个项目（Project）代表一个"小说转剧本"的完整工作单元，
    包含：小说原文、生成的剧本、人物角色、剧情节奏、生成日志等子表。
    删除项目时，级联删除所有关联子表数据。
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base


class Project(Base):
    __tablename__ = "projects"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, comment="项目唯一ID")
    title = Column(String(255), nullable=False, comment="项目标题")
    description = Column(Text, nullable=True, comment="项目描述")
    generation_stage = Column(String(50), default="idle", comment="当前生成阶段: idle / analyzing / characters / scenes / script / completed")
    created_at = Column(DateTime, default=datetime.utcnow, comment="创建时间")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, comment="更新时间")

    # 关联表 — 级联删除: 删除项目时自动清理子表数据
    novel = relationship("Novel", back_populates="project", uselist=False, cascade="all, delete-orphan")
    scripts = relationship("Script", back_populates="project", cascade="all, delete-orphan")
    characters = relationship("Character", back_populates="project", cascade="all, delete-orphan")
    rhythm_points = relationship("RhythmPoint", back_populates="project", cascade="all, delete-orphan")
    generation_logs = relationship("GenerationLog", back_populates="project", cascade="all, delete-orphan")
    character_relationships = relationship("CharacterRelationship", back_populates="project", cascade="all, delete-orphan")
