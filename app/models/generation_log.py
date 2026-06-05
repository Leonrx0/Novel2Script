"""
    GenerationLog 模型 — AI 生成日志表
    ===================================
    记录每一次 AI 生成阶段（分析/人物/节奏/剧本）的执行状态和结果。
    用于追踪生成进度、排查失败原因、查看历史生成记录。

    stage:  生成阶段 — analyze / characters / rhythm / script
    status: 执行状态 — pending / running / success / failed
    result: 结构化结果数据（JSON），成功时存放 AI 返回的内容摘要
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, ForeignKey, JSON, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base


class GenerationLog(Base):
    """生成日志 — 记录 AI 各阶段生成状态"""
    __tablename__ = "generation_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, comment="日志唯一ID")
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, comment="所属项目ID")
    stage = Column(String(50), nullable=False, comment="生成阶段: analyze / characters / rhythm / script")
    status = Column(String(50), default="pending", comment="执行状态: pending / running / success / failed")
    result = Column(JSON, nullable=True, comment="生成结果摘要（JSON格式）")
    created_at = Column(DateTime, default=datetime.utcnow, comment="生成时间")

    project = relationship("Project", back_populates="generation_logs")
