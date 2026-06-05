import json
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.project import Project
from app.models.novel import Novel
from app.models.script import Script
from app.models.character import Character, CharacterRelationship
from app.models.rhythm import RhythmPoint
from app.models.generation_log import GenerationLog
from app.schemas.project import GenerationStage
from app.services.ai_service import ai_service

router = APIRouter()


def _get_novel(db: Session, project_id: UUID) -> str:
    novel = db.query(Novel).filter(Novel.project_id == project_id).first()
    if not novel or not novel.content:
        raise HTTPException(status_code=404, detail="Novel content not found")
    return novel.content


def _log_stage(db: Session, project_id: UUID, stage: str, status: str, result=None):
    log = GenerationLog(project_id=project_id, stage=stage, status=status, result=result)
    db.add(log)
    db.commit()


@router.post("/stream")
def generate_stream(stage_req: GenerationStage, db: Session = Depends(get_db)):
    """流式 AI 生成（SSE）"""
    project = db.query(Project).filter(Project.id == stage_req.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    novel = db.query(Novel).filter(Novel.project_id == stage_req.project_id).first()
    if not novel or not novel.content:
        raise HTTPException(status_code=400, detail="No novel content available")

    def event_generator():
        for chunk in ai_service.generate_stream(
            str(stage_req.project_id),
            novel.content,
            stage_req.stage
        ):
            yield f"data: {chunk}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream"
    )


@router.post("/analyze/{project_id}")
def analyze_novel(project_id: UUID, db: Session = Depends(get_db)):
    """分析小说结构"""
    novel_content = _get_novel(db, project_id)

    analysis = ai_service.analyze_novel(novel_content)

    project = db.query(Project).filter(Project.id == project_id).first()
    project.generation_stage = "analyzing"
    _log_stage(db, project_id, "analyze", "success", analysis)
    db.commit()

    return {"stage": "analyze", "result": analysis}


@router.post("/characters/{project_id}")
def extract_characters(project_id: UUID, db: Session = Depends(get_db)):
    """提取人物关系"""
    novel_content = _get_novel(db, project_id)

    characters_data = ai_service.extract_characters(novel_content)

    # 清空旧的人物数据
    db.query(CharacterRelationship).filter(CharacterRelationship.project_id == project_id).delete()
    db.query(Character).filter(Character.project_id == project_id).delete()

    # 创建新的人物
    char_id_map = {}
    for char_data in characters_data:
        char = Character(
            project_id=project_id,
            name=char_data.get("name", "Unknown"),
            role=char_data.get("role", "supporting"),
            description=char_data.get("description", "")
        )
        db.add(char)
        db.commit()
        db.refresh(char)
        char_id_map[char_data.get("id", str(char.id))] = char.id

    # 创建关系
    for char_data in characters_data:
        source_id = char_id_map.get(char_data.get("id"))
        for rel in char_data.get("relationships", []):
            target_id = char_id_map.get(rel.get("target"))
            if source_id and target_id:
                relationship = CharacterRelationship(
                    project_id=project_id,
                    source_id=source_id,
                    target_id=target_id,
                    relation_type=rel.get("type", "关系"),
                    description=rel.get("description", "")
                )
                db.add(relationship)

    project = db.query(Project).filter(Project.id == project_id).first()
    project.generation_stage = "characters"
    _log_stage(db, project_id, "characters", "success", {"count": len(characters_data)})
    db.commit()

    return {"stage": "characters", "characters": characters_data}


@router.post("/rhythm/{project_id}")
def analyze_rhythm(project_id: UUID, db: Session = Depends(get_db)):
    """分析剧情节奏"""
    novel_content = _get_novel(db, project_id)

    rhythm_data = ai_service.analyze_rhythm(novel_content)

    # 清空旧的节奏数据
    db.query(RhythmPoint).filter(RhythmPoint.project_id == project_id).delete()

    # 创建新的节奏点
    for point in rhythm_data:
        rp = RhythmPoint(
            project_id=project_id,
            position=point.get("position", 0),
            intensity=point.get("intensity", 5),
            label=point.get("label", ""),
            description=point.get("description", "")
        )
        db.add(rp)

    project = db.query(Project).filter(Project.id == project_id).first()
    project.generation_stage = "scenes"
    _log_stage(db, project_id, "rhythm", "success", {"count": len(rhythm_data)})
    db.commit()

    return {"stage": "rhythm", "rhythm_data": {"points": rhythm_data}}


@router.post("/script/{project_id}")
def generate_script(project_id: UUID, db: Session = Depends(get_db)):
    """生成剧本"""
    novel_content = _get_novel(db, project_id)

    characters = db.query(Character).filter(Character.project_id == project_id).all()
    char_list = [{"name": c.name, "role": c.role, "description": c.description} for c in characters]

    script_content = ai_service.generate_script(novel_content, char_list)

    # 创建新的剧本版本
    last_script = db.query(Script).filter(Script.project_id == project_id).order_by(Script.version.desc()).first()
    version = (last_script.version + 1) if last_script else 1

    script = Script(
        project_id=project_id,
        content=script_content,
        version=version
    )
    db.add(script)

    project = db.query(Project).filter(Project.id == project_id).first()
    project.generation_stage = "script"
    _log_stage(db, project_id, "script", "success", {"version": version})
    db.commit()

    return {"stage": "script", "script": script_content}
