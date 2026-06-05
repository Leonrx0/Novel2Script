"""
    Novel 模型 — 小说原文表
    ==========================
    存储用户上传/粘贴的原始小说文本内容。
    与 Project 是一对一关系（unique=True），每个项目只对应一篇小说。
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, Text, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base


class Novel(Base):
    __tablename__ = "novels"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, comment="小说唯一ID")
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), unique=True, nullable=False, comment="所属项目ID (一对一)")
    content = Column(Text, nullable=True, comment="小说原文文本内容")
    created_at = Column(DateTime, default=datetime.utcnow, comment="上传时间")

    project = relationship("Project", back_populates="novel")
