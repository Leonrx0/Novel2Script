import json
import httpx
from typing import List, Dict, Any, Generator
from app.core.config import get_settings

settings = get_settings()


class AIService:
    def __init__(self):
        self.api_key = settings.QWEN_API_KEY
        self.api_base = settings.QWEN_API_BASE
        self.model = settings.QWEN_MODEL
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

    def _call_api(self, messages: List[Dict[str, str]], temperature: float = 0.7) -> str:
        """调用 Qwen API"""
        if not self.api_key:
            return self._mock_response(messages)

        url = f"{self.api_base}"
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": 8192
        }

        print(f"\n[AI Request] POST {url}")
        print(f"[AI Request] model={self.model}, messages_count={len(messages)}")

        with httpx.Client(timeout=120.0) as client:
            response = client.post(url, headers=self.headers, json=payload)
            print(f"[AI Response] status={response.status_code}")
            if response.status_code != 200:
                print(f"[AI Response] body={response.text[:500]}")
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]

    def _extract_json(self, text: str) -> Any:
        """从 AI 响应中提取 JSON（兼容 markdown 代码块包裹）"""
        text = text.strip()
        # 尝试直接解析
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass
        # 尝试提取 markdown 代码块中的 JSON
        import re
        patterns = [
            r'```json\s*([\s\S]*?)\s*```',
            r'```\s*([\s\S]*?)\s*```',
            r'\{[\s\S]*\}',
        ]
        for pattern in patterns:
            matches = re.findall(pattern, text)
            for match in matches:
                try:
                    return json.loads(match.strip())
                except json.JSONDecodeError:
                    continue
        raise ValueError(f"无法从响应中提取有效 JSON: {text[:200]}...")

    def _mock_response(self, messages: List[Dict[str, str]]) -> str:
        """模拟 AI 响应（用于测试）"""
        content = messages[-1].get("content", "")
        if "人物" in content or "角色" in content or "character" in content.lower():
            return json.dumps({
                "characters": [
                    {"id": "char_1", "name": "主角A", "role": "protagonist", "description": "勇敢的年轻人"},
                    {"id": "char_2", "name": "反派B", "role": "antagonist", "description": "神秘的敌人"}
                ]
            }, ensure_ascii=False)
        elif "节奏" in content or "rhythm" in content.lower():
            return json.dumps({
                "rhythm_points": [
                    {"position": 0.1, "intensity": 3, "label": "开端", "description": "故事开始"},
                    {"position": 0.5, "intensity": 8, "label": "高潮", "description": "冲突爆发"},
                    {"position": 0.9, "intensity": 5, "label": "结局", "description": "问题解决"}
                ]
            }, ensure_ascii=False)
        elif "剧本" in content or "script" in content.lower():
            return """title: 示例剧本
acts:
  - act: 1
    title: 第一幕
    scenes:
      - scene: 1
        location: 小镇广场
        characters:
          - 主角A
        action: |
          主角A 站在广场中央，环顾四周。
        dialogue:
          - character: 主角A
            line: "这一切 must end today."
"""
        return "AI 响应内容（请配置 QWEN_API_KEY）"

    def analyze_novel(self, novel_content: str) -> Dict[str, Any]:
        """第一阶段：分析小说结构"""
        system_prompt = """你是一位资深文学评论家。请对用户提供的小说进行深度分析。

**重要规则**：
1. 你必须直接输出 JSON，不要包含任何解释性文字、markdown 代码块标记（如 ```json）或其他格式。
2. JSON 必须可以被标准 JSON 解析器直接解析。
3. 所有字段的值必须使用中文。

**输出格式（JSON Schema）**：
{
  "theme": "小说的核心主题（一句话概括）",
  "structure": "故事结构类型（如：三幕式/线性叙事/环形结构）",
  "key_events": [
    {"event": "事件描述", "position": "在故事中的大致位置（如：开端/发展/高潮/结局）"}
  ],
  "style": "叙述风格和语言特点"
}
"""
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"请分析以下小说，直接输出 JSON：\n\n{novel_content[:5000]}"}
        ]
        response = self._call_api(messages, temperature=0.1)
        try:
            return self._extract_json(response)
        except Exception as e:
            print(f"[analyze_novel] JSON 解析失败: {e}")
            return {"theme": "无法解析", "structure": "未知", "key_events": [], "style": "未知"}

    def extract_characters(self, novel_content: str) -> List[Dict[str, Any]]:
        """第二阶段：提取人物关系"""
        system_prompt = """你是一位专业的人物分析专家。请从用户提供的小说中提取所有角色信息及其关系网络。

**重要规则**：
1. 你必须直接输出 JSON，不要包含任何解释性文字、markdown 代码块标记或其他格式。
2. 每个角色必须有唯一且稳定的 id（如 char_1, char_2）。
3. role 字段只能是：protagonist（主角）、antagonist（反派）、supporting（配角）之一。
4. 关系中的 target 必须使用角色 id，而不是名字。
5. 所有字段的值必须使用中文。

**输出格式（JSON Schema）**：
{
  "characters": [
    {
      "id": "char_1",
      "name": "角色姓名",
      "role": "protagonist",
      "description": "角色简短描述（30-50字）",
      "relationships": [
        {"target": "char_2", "type": "朋友/敌人/恋人/家人/师徒/上下级", "description": "关系描述"}
      ]
    }
  ]
}
"""
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"请从以下小说中提取所有角色及其关系，直接输出 JSON：\n\n{novel_content[:8000]}"}
        ]
        response = self._call_api(messages, temperature=0.1)
        try:
            data = self._extract_json(response)
            characters = data.get("characters", [])
            print(f"[extract_characters] 提取到 {len(characters)} 个角色")
            for c in characters:
                rel_count = len(c.get("relationships", []))
                print(f"  - {c.get('name')} ({c.get('role')}): {rel_count} 个关系")
            return characters
        except Exception as e:
            print(f"[extract_characters] JSON 解析失败: {e}")
            return []

    def analyze_rhythm(self, novel_content: str) -> List[Dict[str, Any]]:
        """第三阶段：分析剧情节奏"""
        system_prompt = """你是一位专业的剧情节奏分析师。请分析小说中的关键情节点及其情感强度。

**重要规则**：
1. 你必须直接输出 JSON，不要包含任何解释性文字、markdown 代码块标记或其他格式。
2. position 字段必须是 0.0 到 1.0 之间的浮点数（0=故事开头，1=故事结尾）。
3. intensity 字段必须是 1 到 10 之间的整数（1=最平缓，10=最高潮）。
4. 必须至少提取 3 个节奏点，最多不超过 10 个。
5. 所有字段的值必须使用中文。

**输出格式（JSON Schema）**：
{
  "rhythm_points": [
    {
      "position": 0.1,
      "intensity": 3,
      "label": "情节点标签（如：开端/发展/转折/高潮/结局）",
      "description": "该情节点的详细描述"
    }
  ]
}
"""
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"请分析以下小说的剧情节奏，直接输出 JSON：\n\n{novel_content[:8000]}"}
        ]
        response = self._call_api(messages, temperature=0.1)
        try:
            data = self._extract_json(response)
            points = data.get("rhythm_points", [])
            print(f"[analyze_rhythm] 提取到 {len(points)} 个节奏点")
            return points
        except Exception as e:
            print(f"[analyze_rhythm] JSON 解析失败: {e}")
            return []

    def generate_script(self, novel_content: str, characters: List[Dict[str, Any]]) -> str:
        """第四阶段：生成剧本（YAML格式）"""
        char_desc = "\n".join([f"- {c['name']} ({c.get('role', 'supporting')}): {c.get('description', '')}" for c in characters])
        system_prompt = """你是一位资深编剧。请将小说改编为标准剧本格式（YAML）。

**重要规则**：
1. 直接输出 YAML 内容，不要包含任何解释性文字、markdown 代码块标记。
2. 必须保持故事核心情节和人物关系不变。
3. 对话要自然、符合人物性格。
4. 场景描述要具体、有画面感。

**输出格式**：
title: 剧本标题
acts:
  - act: 1
    title: 幕标题
    scenes:
      - scene: 1
        location: 场景地点
        characters:
          - 角色名
        action: |
          场景动作描述（使用 | 保持多行格式）
        dialogue:
          - character: 角色名
            line: "台词内容"
"""
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"请将以下小说改编为 YAML 剧本。\n\n角色信息：\n{char_desc}\n\n小说内容：\n\n{novel_content[:10000]}"}
        ]
        return self._call_api(messages, temperature=0.3)

    def generate_stream(self, project_id: str, novel_content: str, stage: str) -> Generator[str, None, None]:
        """流式生成（SSE）"""
        stages = {
            "analyze": self.analyze_novel,
            "characters": self.extract_characters,
            "rhythm": self.analyze_rhythm,
            "script": self.generate_script
        }

        if stage in stages:
            yield json.dumps({"type": "progress", "stage": stage, "progress": 0, "message": "开始处理..."})

            if stage == "script":
                result = self.generate_script(novel_content, [])
            else:
                result = stages[stage](novel_content)

            yield json.dumps({"type": "progress", "stage": stage, "progress": 50, "message": "处理中..."})
            yield json.dumps({"type": "result", "stage": stage, "data": result})
            yield json.dumps({"type": "progress", "stage": stage, "progress": 100, "message": "完成"})


ai_service = AIService()
