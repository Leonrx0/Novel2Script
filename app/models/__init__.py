"""
    models 包 — SQLAlchemy ORM 模型层
    ================================
    定义数据库表结构及表间关系（一对一 / 一对多 / 多对多）。
    
    核心模型:
    - Project:      项目主表，聚合所有子表
    - Novel:        小说原文（1:1）
    - Script:       生成的剧本（1:N，支持多版本）
    - Character:    人物角色（1:N）
    - CharacterRelationship: 人物关系（有向图，N:M）
    - RhythmPoint:  剧情节奏点（1:N）
    - GenerationLog: AI 生成日志（1:N）
"""
from .project import Project
from .novel import Novel
from .script import Script
from .character import Character, CharacterRelationship
from .rhythm import RhythmPoint
from .generation_log import GenerationLog

__all__ = [
    "Project",
    "Novel",
    "Script",
    "Character",
    "CharacterRelationship",
    "RhythmPoint",
    "GenerationLog",
]
