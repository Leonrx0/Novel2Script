"""
    Script 模型 — 剧本表
    =====================
    存储 AI 生成的 YAML 格式剧本内容。
    支持多版本（version），每次重新生成自动递增版本号，
    方便用户回溯历史剧本。
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, Text, ForeignKey, Integer, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base


class Script(Base):
    __tablename__ = "scripts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, comment="剧本唯一ID")
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, comment="所属项目ID")
    content = Column(Text, nullable=True, comment="YAML 格式剧本内容")
    version = Column(Integer, default=1, comment="剧本版本号，每次重新生成 +1")
    created_at = Column(DateTime, default=datetime.utcnow, comment="创建时间")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, comment="更新时间")

    project = relationship("Project", back_populates="scripts")
