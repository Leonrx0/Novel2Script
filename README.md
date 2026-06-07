<p align="center">
  <h1 align="center">🎬 NovelToScript</h1>
  <p align="center"><b>小说 → 工业级剧本 → AI 视频</b></p>
  <p align="center">
    基于 Qwen 大模型的多阶段智能生成工具，将小说一键转换为面向 AI 视频生成的结构化剧本。
  </p>
</p>

---

## 产品定位

NovelToScript 解决的核心问题：**文学语言无法被 AI 视频模型直接理解。**

传统小说改编的剧本是「给人看的」—— 一大段 `action` 文字描述场景，导演靠经验分镜。但 AI 视频生成模型（如 Sora、Runway、Pika）需要精确的、逐帧可执行的结构化指令：景别、角度、运镜、角色外观、情绪状态、道具一致性。

**NovelToScript 是业界首个面向 AI 视频生成的「小说转剧本」流水线：**

| 阶段 | 传统流程 | NovelToScript |
|------|---------|---------------|
| 输入 | 小说原文 | 小说原文 |
| 分析 | 人工读稿 | AI 自动结构分析、人物提取、道具提取、节奏分析 |
| 输出 | 文学剧本（给人看） | **工业级 YAML（给机器执行）**：每行对应一个视频生成 Prompt |
| 一致性 | 导演口头交代 | **全局资产库**：角色/道具注册 + `reference_image` 锁定 |
| 可控性 | 演员自由发挥 | **受控情绪词表**：`suspicious` → TTS 声线 + 面部参数 |

---

## 核心功能

- **多阶段 AI 生成**: 结构分析 → 人物与道具提取 → 节奏分析 → 工业级剧本生成
- **YAML Schema**: 面向 AI 视频生成的工业级剧本格式（Beats, Shots, Emotions, Props）
- **全局资产库**: 角色（Characters）与道具（Props）全局注册，确保 AI 视频一致性
- **节拍级导演**: Beat（镜头单元）拆解，每拍对应独立视频生成 Prompt
- **表演控制**: 受控情绪词表（Emotion Enum），直接映射 TTS 与面部参数
- **视觉导演**: `shot_type` + `camera_angle` + `camera_movement`，直接翻译为摄影语言
- **剧情节奏分析**: ECharts 可视化展示故事高潮低谷分布
- **人物关系图**: ReactFlow 可视化角色网络
- **在线编辑**: Monaco Editor 专业 YAML 编辑
- **导出 YAML**: 一键下载面向 AI 视频生成的标准剧本文件

---

## 技术栈

- **前端**: React 18 + TypeScript + Vite + Ant Design + Monaco Editor + ReactFlow + ECharts
- **后端**: FastAPI + SQLAlchemy + asyncpg + PostgreSQL
- **AI**: Qwen (通义千问) API

---

## 快速开始

### 1. 环境准备

- Python 3.10+
- Node.js 18+
- PostgreSQL 14+

### 2. 数据库初始化

```bash
# 第一步：创建数据库和用户
cd backend
psql -U postgres -f init_db.sql

# 第二步：授予权限
psql -U postgres -d noveltoscript -f init_db2.sql

# 第三步：执行迁移（升级到工业级剧本结构）
psql -U user -d noveltoscript -f migration_v2.sql
```

### 3. 启动后端

```bash
cd backend

# 创建虚拟环境
python3 -m venv venv
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt

# 配置环境变量（复制并编辑）
cp .env.example .env
# 编辑 .env，填入 DATABASE_URL 和 QWEN_API_KEY

# 启动服务
uvicorn app.main:app --reload --port 8000
```

### 4. 启动前端

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

- 前端地址：`http://localhost:5173`
- 后端地址：`http://localhost:8000`
- API 文档：`http://localhost:8000/docs`

---

## 生成流水线

```
小说原文
   │
   ▼
┌─────────────────────────────────────┐
│  Stage 1: 结构分析 (analyze)         │
│  提取主题、结构、关键事件、风格        │
└─────────────────────────────────────┘
   │
   ▼
┌─────────────────────────────────────┐
│  Stage 2: 人物与道具提取 (characters) │
│  提取角色（含 gender/age/appearance） │
│  提取道具（含 prop_id/description）   │
│  生成全局资产库                       │
└─────────────────────────────────────┘
   │
   ▼
┌─────────────────────────────────────┐
│  Stage 3: 节奏分析 (rhythm)          │
│  识别高潮/低谷，生成节奏曲线           │
└─────────────────────────────────────┘
   │
   ▼
┌─────────────────────────────────────┐
│  Stage 4: 剧本生成 (script)          │
│  输出工业级 YAML：                   │
│  · 场景按 Beat 拆解                  │
│  · 每个 Beat = 一个视频 Prompt        │
│  · 情绪标签 + 镜头语言 + 资产引用      │
└─────────────────────────────────────┘
```

---

## 剧本 YAML 格式示例（面向 AI 视频生成）

```yaml
title: 雨夜的访客
version: "1.0"

# 全局资产库 —— 确保 AI 视频生成一致性
characters:
  - id: lm
    name: 林默
    gender: 男
    age: 32
    appearance: 短发，略显疲惫，穿着灰色居家服
    reference_image: "assets/lin_mo_ref.png"

  - id: sw
    name: 苏婉
    gender: 女
    age: 28
    appearance: 黑色雨衣，帽檐滴水，神情疲惫
    reference_image: "assets/su_wan_ref.png"

props:
  - id: rusty_key
    name: 生锈的铜钥匙
    description: 表面有严重氧化痕迹，带有复古雕花

# 剧本正文 —— 以 Beat（节拍/镜头单元）为最小单位
acts:
  - act_id: 1
    title: 第一幕
    scenes:
      - scene_id: 1
        location: 林默公寓
        time: 凌晨
        atmosphere: 压抑、悬疑
        beats:
          - beat_id: 1
            shot_type: Wide Shot
            camera_angle: Eye level
            camera_movement: Static
            action: |
              暴雨如注，敲打着老旧公寓的窗玻璃。房间内灯光昏黄。
            duration: 3s
            audio: heavy_rain_sound.mp3

          - beat_id: 2
            shot_type: Close Up
            camera_angle: Eye level
            camera_movement: Slow Zoom In
            action: |
              林默坐在书桌前，手里把玩着一枚生锈的铜钥匙。
            prop_refs: [rusty_key]
            character_refs: [lm]
            duration: 4s

          - beat_id: 3
            shot_type: Medium Shot
            camera_angle: Low angle
            camera_movement: Static
            action: |
              门铃突然响起，林默皱眉，起身走向房门。
            character_refs: [lm]
            dialogue:
              - speaker: lm
                emotion: suspicious
                line: "谁？"
            duration: 3s
```

> 📖 **Schema 规范详解**：参见 `docs/script-yaml-schema.md`

---

## API 概览

| 接口 | 方法 | 描述 |
|------|------|------|
| `/api/v1/projects` | GET/POST | 项目列表 / 创建 |
| `/api/v1/projects/{id}` | GET/PUT/DELETE | 项目详情 / 更新 / 删除 |
| `/api/v1/generate/analyze/{id}` | POST | 结构分析 |
| `/api/v1/generate/characters/{id}` | POST | 人物与道具提取（含全局资产库生成） |
| `/api/v1/generate/rhythm/{id}` | POST | 节奏分析 |
| `/api/v1/generate/script/{id}` | POST | 工业级剧本生成（Beats, Shots, Emotions） |
| `/api/v1/generate/stream` | POST | SSE 流式生成 |

---

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `DATABASE_URL` | PostgreSQL 连接串 | `postgresql+asyncpg://...` |
| `QWEN_API_KEY` | 通义千问 API Key | 必填 |
| `QWEN_API_BASE` | API 地址 | `https://dashscope.aliyuncs.com/compatible-mode/v1` |
| `QWEN_MODEL` | 模型名称 | `qwen-max` |

---

## 项目结构

```
├── backend/              # FastAPI 后端
│   ├── app/
│   │   ├── core/         # 配置 & 数据库
│   │   ├── models/       # SQLAlchemy 模型
│   │   │   ├── character.py          # 角色模型（含 gender/age/appearance）
│   │   │   ├── prop.py               # 道具资产模型 ⭐
│   │   │   ├── script.py             # 剧本模型（多版本）
│   │   │   └── ...
│   │   ├── schemas/      # Pydantic 校验模型
│   │   ├── api/v1/       # API 路由
│   │   │   └── endpoints/
│   │   │       ├── projects.py       # 项目管理 CRUD
│   │   │       └── generate.py       # AI 生成接口（4 阶段流水线）
│   │   └── services/
│   │       ├── ai_service.py         # Qwen API 封装 & Prompt 工程
│   │       └── relationship_merger.py # 人物关系合并去重
│   ├── init_db.sql       # 数据库初始化（Part 1）
│   ├── init_db2.sql      # 数据库初始化（Part 2）
│   └── migration_v2.sql  # v2 迁移：工业级剧本结构升级 ⭐
│
├── frontend/             # React 前端
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   │   ├── Home.tsx              # 首页 & 流程展示
│   │   │   ├── ProjectList.tsx       # 项目管理
│   │   │   ├── Editor.tsx            # 小说 & 剧本编辑（Monaco）
│   │   │   ├── CharacterGraph.tsx    # ReactFlow 人物关系图
│   │   │   └── Analysis.tsx          # ECharts 节奏分析
│   │   └── services/
│   │       └── api.ts                # Axios API 封装
│   └── ...
│
└── docs/
    └── script-yaml-schema.md         # 工业级 YAML Schema 规范
```

---

## 架构设计要点

### 为什么用 Beat 替代传统的 Action？

传统剧本中 `action` 是一段连续描述，AI 视频模型无法自动分镜。我们将 `action` 降维为 **Beat**（节拍/镜头单元）：

- **1 个 Beat = 1 个视频生成 Prompt**
- 每个 Beat 自带 `shot_type`（景别）、`camera_angle`（角度）、`camera_movement`（运镜），直接翻译为摄影参数
- `duration` 字段直接对应视频生成 API 的时长参数

### 为什么需要全局资产库？

AI 视频生成最大的痛点是 **一致性（Consistency）**：

- **角色一致性**：如果每帧都重新描述「林默是一位32岁短发男性」，AI 可能生成不同面孔。通过全局 `characters` 注册 + `reference_image`，所有涉及 `lm` 的 Beat 都锁定同一张参考图。
- **道具一致性**：贯穿全剧的「生锈铜钥匙」如果每帧描述不同，会变成不同的钥匙。通过全局 `props` 注册 + `prop_refs` 引用，确保每次生成同一把钥匙。

### 为什么 emotion 是受控词表？

TTS API（如 ElevenLabs）和视频生成 API 需要标准化的情感参数。如果让 AI 自由发挥「欣喜若狂」「心如刀绞」，API 无法解析。本 Schema 强制使用 **7 种受控情绪**：

`neutral` | `happy` | `sad` | `angry` | `fearful` | `surprised` | `suspicious`

这些标签可直接映射到：
- TTS：`style`, `stability`, `similarity_boost`
- 视频生成：`facial_expression`, `body_language`, `gaze_direction`

---

## 路线图

- [x] 多阶段 AI 生成流水线（分析 → 人物/道具 → 节奏 → 剧本）
- [x] 工业级 YAML Schema（Beats, Shots, Emotions, Props）
- [x] 全局资产库（Character + Prop 注册与引用）
- [x] 人物关系图（ReactFlow）
- [x] 节奏分析可视化（ECharts）
- [x] Monaco Editor YAML 编辑
- [ ] 接入 AI 视频生成 API（Runway / Pika / Sora）
- [ ] 角色参考图自动生成功能（文生图模型）
- [ ] 剧本分镜预览（Storyboard）
- [ ] 多语言剧本生成支持
- [ ] 版本对比与 Diff 视图

---

## 许可证

MIT License

