"""
    RhythmPoint 模型 — 剧情节奏点表
    ================================
    存储 AI 分析的故事节奏数据，每个节奏点代表一个关键情节点。

    - position: 0.0 ~ 1.0，表示在故事全篇中的相对位置（0=开头, 1=结尾）
    - intensity: 1 ~ 10，情节强度（1=平缓, 10=高潮/冲突最激烈）

    前端可用 ECharts 将这些点连成折线图，直观展示故事的节奏起伏。
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, ForeignKey, Integer, Float, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base


class RhythmPoint(Base):
    """剧情节奏点 — 标注故事中的关键情节及其强度"""
    __tablename__ = "rhythm_points"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, comment="节奏点唯一ID")
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, comment="所属项目ID")
    position = Column(Float, nullable=False, comment="故事位置: 0.0(开头) ~ 1.0(结尾)")
    intensity = Column(Integer, nullable=False, comment="情节强度: 1(平缓) ~ 10(高潮)")
    label = Column(String(255), nullable=False, comment="节奏点标签，如: 开端 / 高潮 / 结局")
    description = Column(Text, nullable=True, comment="节奏点详细描述")
    created_at = Column(DateTime, default=datetime.utcnow, comment="创建时间")

    project = relationship("Project", back_populates="rhythm_points")
