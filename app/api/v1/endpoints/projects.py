from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.project import Project
from app.models.novel import Novel
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse, ProjectDetailResponse

router = APIRouter()


@router.get("/", response_model=List[ProjectResponse])
def list_projects(db: Session = Depends(get_db)):
    """获取项目列表"""
    projects = db.query(Project).order_by(Project.created_at.desc()).all()
    return projects


@router.post("/", response_model=ProjectResponse)
def create_project(project: ProjectCreate, db: Session = Depends(get_db)):
    """创建新项目"""
    db_project = Project(
        title=project.title,
        description=project.description,
    )
    db.add(db_project)
    db.commit()
    db.refresh(db_project)

    if project.novel_content:
        novel = Novel(project_id=db_project.id, content=project.novel_content)
        db.add(novel)
        db.commit()

    return db_project


@router.get("/{project_id}", response_model=ProjectDetailResponse)
def get_project(project_id: UUID, db: Session = Depends(get_db)):
    """获取项目详情"""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    return ProjectDetailResponse(
        id=project.id,
        title=project.title,
        description=project.description,
        generation_stage=project.generation_stage,
        created_at=project.created_at,
        updated_at=project.updated_at,
        novel={
            "id": project.novel.id,
            "project_id": project.novel.project_id,
            "content": project.novel.content,
            "created_at": project.novel.created_at,
        } if project.novel else None,
        scripts=[{
            "id": s.id,
            "project_id": s.project_id,
            "content": s.content,
            "version": s.version,
            "created_at": s.created_at,
            "updated_at": s.updated_at,
        } for s in project.scripts],
        characters=[{
            "id": c.id,
            "project_id": c.project_id,
            "name": c.name,
            "role": c.role,
            "description": c.description,
            "created_at": c.created_at,
            "updated_at": c.updated_at,
        } for c in project.characters],
        rhythm_points=[{
            "id": r.id,
            "project_id": r.project_id,
            "position": r.position,
            "intensity": r.intensity,
            "label": r.label,
            "description": r.description,
            "created_at": r.created_at,
        } for r in project.rhythm_points],
        generation_logs=[],
        character_relationships=[{
            "id": rel.id,
            "project_id": rel.project_id,
            "source_id": rel.source_id,
            "target_id": rel.target_id,
            "relation_type": rel.relation_type,
            "description": rel.description,
            "created_at": rel.created_at,
        } for rel in project.character_relationships],
    )


@router.put("/{project_id}", response_model=ProjectResponse)
def update_project(project_id: UUID, project_update: ProjectUpdate, db: Session = Depends(get_db)):
    """更新项目（含小说内容、剧本内容）"""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    update_data = project_update.model_dump(exclude_unset=True)

    # 提取关联表字段
    novel_content = update_data.pop('novel_content', None)
    script_content = update_data.pop('script_content', None)

    # 更新 Project 自身字段
    for field, value in update_data.items():
        setattr(project, field, value)

    # 更新小说内容
    if novel_content is not None:
        novel = db.query(Novel).filter(Novel.project_id == project_id).first()
        if novel:
            novel.content = novel_content
        else:
            db.add(Novel(project_id=project_id, content=novel_content))

    # 更新剧本内容（更新最新版本）
    if script_content is not None:
        last_script = db.query(Script).filter(Script.project_id == project_id).order_by(Script.version.desc()).first()
        if last_script:
            last_script.content = script_content
        else:
            db.add(Script(project_id=project_id, content=script_content, version=1))

    db.commit()
    db.refresh(project)
    return project


@router.delete("/{project_id}")
def delete_project(project_id: UUID, db: Session = Depends(get_db)):
    """删除项目"""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    db.delete(project)
    db.commit()
    return {"message": "Project deleted successfully"}
