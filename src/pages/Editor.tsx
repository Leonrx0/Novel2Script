import { useMemo, useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button, Card, Input, message, Modal, Space, Steps, Tag, Tabs, Typography } from 'antd'
import Editor from '@monaco-editor/react'
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  CopyOutlined,
  DownloadOutlined,
  LoadingOutlined,
  PlayCircleOutlined,
  RobotOutlined,
  SaveOutlined,
  SendOutlined,
  TeamOutlined,
  AreaChartOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons'
import { projectApi, generateApi } from '../services/api'
import type { Project } from '../services/api'
import * as yaml from 'js-yaml'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const { TextArea } = Input
const { Text } = Typography

interface StepStatus {
  title: string
  status: 'wait' | 'process' | 'finish' | 'error'
  detail?: string
}

interface DiffLine {
  type: 'same' | 'added' | 'removed'
  text: string
}

interface AssistantDraft {
  content: string
  scope?: { start: number; end: number }
  original_part?: string
  modified_part?: string
}

function buildLineDiff(original: string, modified: string): DiffLine[] {
  const originalLines = original.split('\n')
  const modifiedLines = modified.split('\n')
  const maxLength = Math.max(originalLines.length, modifiedLines.length)
  const diff: DiffLine[] = []

  for (let index = 0; index < maxLength; index += 1) {
    const originalLine = originalLines[index]
    const modifiedLine = modifiedLines[index]

    if (originalLine === modifiedLine) {
      if (originalLine !== undefined) diff.push({ type: 'same', text: originalLine })
      continue
    }

    if (originalLine !== undefined) diff.push({ type: 'removed', text: originalLine })
    if (modifiedLine !== undefined) diff.push({ type: 'added', text: modifiedLine })
  }

  return diff
}

export default function ScriptEditor() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [project, setProject] = useState<Project | null>(null)
  const [novelContent, setNovelContent] = useState('')
  const [assistantPrompt, setAssistantPrompt] = useState('')
  const [assistantMessages, setAssistantMessages] = useState<Array<{ role: 'assistant' | 'user'; content: string }>>([
    { role: 'assistant', content: '我可以帮你把内容整理得更适合展示，也可以协助提炼结构。' },
  ])
  const [scriptYaml, setScriptYaml] = useState('')
  const [activeTab, setActiveTab] = useState('novel')
  const [genModalOpen, setGenModalOpen] = useState(false)
  const [genSteps, setGenSteps] = useState<StepStatus[]>([
    { title: '结构分析', status: 'wait' },
    { title: '人物提取', status: 'wait' },
    { title: '节奏分析', status: 'wait' },
    { title: '剧本生成', status: 'wait' },
  ])
  const [genRunning, setGenRunning] = useState(false)
  const [genError, setGenError] = useState('')
  const [assistantCollapsed, setAssistantCollapsed] = useState(false)
  const [assistantLoading, setAssistantLoading] = useState(false)
  const [pendingDraft, setPendingDraft] = useState<AssistantDraft | null>(null)

  useEffect(() => {
    if (id) {
      fetchProject(id)
    }
  }, [id])

  const fetchProject = async (projectId: string) => {
    try {
      const res = await projectApi.get(projectId)
      setProject(res.data)
      setNovelContent(res.data.novel?.content || '')
      setScriptYaml(res.data.scripts?.[0]?.content || '')
    } catch {
      message.error('获取项目失败')
    }
  }

  const handleSaveNovel = async () => {
    if (!id) return
    try {
      await projectApi.update(id, { novel_content: novelContent })
      message.success('小说内容已保存')
    } catch {
      message.error('保存失败')
    }
  }

  const handleSaveScript = async () => {
    if (!id) return
    try {
      await projectApi.update(id, { script_content: scriptYaml })
      message.success('剧本已保存')
    } catch {
      message.error('保存失败')
    }
  }

  const previewContent = useMemo(() => novelContent.trim(), [novelContent])
  const diffLines = useMemo(() => {
    if (!pendingDraft) return []
    const original = pendingDraft.original_part ?? ''
    const modified = pendingDraft.modified_part ?? ''
    return buildLineDiff(original, modified)
  }, [pendingDraft])

  const handleAssistantSend = async () => {
    const prompt = assistantPrompt.trim()
    if (!prompt || !id) return

    setAssistantMessages((prev) => [...prev, { role: 'user', content: prompt }, { role: 'assistant', content: '' }])
    setAssistantPrompt('')
    setAssistantLoading(true)
    setPendingDraft(null)

    try {
      const response = await fetch(generateApi.assistantStreamUrl(id), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: novelContent, instruction: prompt }),
      })
      if (!response.ok || !response.body) throw new Error('AI 请求失败')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let assistantReply = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const events = buffer.split('\n\n')
        buffer = events.pop() || ''

        for (const rawEvent of events) {
          const line = rawEvent.split('\n').find((item) => item.startsWith('data:'))
          if (!line) continue
          const payload = line.replace(/^data:\s*/, '')
          if (payload === '[DONE]') continue
          const event = JSON.parse(payload)

          if (event.type === 'delta') {
            assistantReply += event.content || ''
            setAssistantMessages((prev) => {
              const next = [...prev]
              next[next.length - 1] = { role: 'assistant', content: assistantReply }
              return next
            })
          }

          if (event.type === 'draft') {
            setPendingDraft({
              content: event.content || '',
              scope: event.scope,
              original_part: event.original_part,
              modified_part: event.modified_part,
            })
            setAssistantMessages((prev) => {
              const next = [...prev]
              next[next.length - 1] = {
                role: 'assistant',
                content: '已生成修改建议。当前只对指定章节做了修改，请确认后再应用。',
              }
              return next
            })
          }
        }
      }
    } catch (error: any) {
      setAssistantMessages((prev) => {
        const next = [...prev]
        next[next.length - 1] = { role: 'assistant', content: error.message || '请求失败，请稍后重试。' }
        return next
      })
    } finally {
      setAssistantLoading(false)
    }
  }

  const applyAssistantToEditor = () => {
    if (!pendingDraft) {
      message.warning('暂无可应用的 AI 修改建议')
      return
    }
    setNovelContent(pendingDraft.content)
    setPendingDraft(null)
    setAssistantMessages((prev) => [...prev, { role: 'assistant', content: '已应用修改，稿件区已更新为最终结果。' }])
  }

  const discardAssistantDraft = () => {
    setPendingDraft(null)
    setAssistantMessages((prev) => [...prev, { role: 'assistant', content: '已放弃本次修改建议，稿件区保持不变。' }])
  }

  const updateStep = (index: number, status: StepStatus['status'], detail?: string) => {
    setGenSteps((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], status, detail }
      return next
    })
  }

  const handleGenerate = async () => {
    if (!id || !novelContent.trim()) {
      message.warning('请先输入小说内容')
      return
    }

    setGenModalOpen(true)
    setGenRunning(true)
    setGenError('')
    setGenSteps([
      { title: '结构分析', status: 'process' },
      { title: '人物提取', status: 'wait' },
      { title: '节奏分析', status: 'wait' },
      { title: '剧本生成', status: 'wait' },
    ])

    try {
      // 1. 结构分析
      const analyzeRes = await generateApi.analyze(id)
      updateStep(0, 'finish', analyzeRes.data.result?.theme || '分析完成')

      // 2. 人物提取
      updateStep(1, 'process')
      const charRes = await generateApi.characters(id)
      const charCount = charRes.data.characters?.length || 0
      updateStep(1, 'finish', `提取到 ${charCount} 个角色`)

      // 3. 节奏分析
      updateStep(2, 'process')
      const rhythmRes = await generateApi.rhythm(id)
      const pointCount = rhythmRes.data.rhythm_data?.points?.length || 0
      updateStep(2, 'finish', `发现 ${pointCount} 个节奏点`)

      // 4. 剧本生成
      updateStep(3, 'process')
      const scriptRes = await generateApi.script(id)
      if (scriptRes.data.script) {
        setScriptYaml(scriptRes.data.script)
        updateStep(3, 'finish', '剧本已生成')
      } else {
        updateStep(3, 'error', '未返回剧本内容')
      }

      setActiveTab('script')
      message.success('多阶段生成完成！')
    } catch (err: any) {
      setGenError(err.response?.data?.detail || '生成失败，请检查后端日志')
      // 标记当前步骤为 error
      setGenSteps((prev) => {
        const next = [...prev]
        const currentIdx = next.findIndex((s) => s.status === 'process')
        if (currentIdx >= 0) next[currentIdx].status = 'error'
        return next
      })
    } finally {
      setGenRunning(false)
    }
  }

  const handleExport = () => {
    if (!scriptYaml) {
      message.warning('没有可导出的剧本')
      return
    }
    const blob = new Blob([scriptYaml], { type: 'text/yaml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${project?.title || 'script'}.yaml`
    a.click()
    URL.revokeObjectURL(url)
  }

  const validateYaml = () => {
    try {
      yaml.load(scriptYaml)
      message.success('YAML 格式正确')
    } catch (e: any) {
      message.error(`YAML 格式错误: ${e.message}`)
    }
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: assistantCollapsed ? 'minmax(0, 1fr) 56px' : 'minmax(0, 1fr) 380px',
        gap: assistantCollapsed ? 12 : 24,
        alignItems: 'stretch',
        transition: 'grid-template-columns 0.2s ease, gap 0.2s ease',
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2>编辑器：{project?.title || '...'}</h2>
          <Space>
            <Button
              icon={<PlayCircleOutlined />}
              type="primary"
              onClick={handleGenerate}
              loading={genRunning}
            >
              开始多阶段生成
            </Button>
            <Button icon={<TeamOutlined />} onClick={() => navigate(`/characters/${id}`)}>
              人物关系
            </Button>
            <Button icon={<AreaChartOutlined />} onClick={() => navigate(`/analysis/${id}`)}>
              剧情分析
            </Button>
            <Button icon={<DownloadOutlined />} onClick={handleExport}>
              导出 YAML
            </Button>
          </Space>
        </div>

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
          {
            key: 'novel',
            label: 'Markdown 编辑',
            children: (
              <Card
                styles={{ body: { padding: 0 } }}
                extra={<Button icon={<SaveOutlined />} onClick={handleSaveNovel}>保存小说</Button>}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: '72vh' }}>
                  <div style={{ padding: 16 }}>
                    <Text strong style={{ display: 'block', marginBottom: 12 }}>Markdown 原文</Text>
                    {pendingDraft ? (
                      <div
                        style={{
                          minHeight: '64vh',
                          maxHeight: '64vh',
                          overflow: 'auto',
                          border: '1px solid #d9d9d9',
                          borderRadius: 6,
                          padding: '8px 11px',
                          fontFamily: 'monospace',
                          fontSize: 14,
                          lineHeight: 1.7,
                          background: '#fff',
                        }}
                      >
                        {diffLines.map((line, index) => (
                          <div
                            key={`${line.type}-${index}`}
                            style={{
                              padding: '1px 4px',
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                              background:
                                line.type === 'added' ? '#f6ffed' :
                                line.type === 'removed' ? '#fff1f0' : 'transparent',
                              color:
                                line.type === 'added' ? '#237804' :
                                line.type === 'removed' ? '#a8071a' : 'inherit',
                              textDecoration: line.type === 'removed' ? 'line-through' : 'none',
                            }}
                          >
                            {line.text || ' '}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <TextArea
                        rows={30}
                        value={novelContent}
                        onChange={(e) => setNovelContent(e.target.value)}
                        placeholder="在此输入 Markdown 原文..."
                        style={{ minHeight: '64vh', resize: 'none', fontFamily: 'monospace' }}
                      />
                    )}
                  </div>

                  <div style={{ padding: 16 }}>
                    <Text strong style={{ display: 'block', marginBottom: 12 }}>Markdown 渲染预览</Text>
                    <Card size="small" style={{ minHeight: '64vh', background: '#fafafa' }}>
                      <div className="markdown-preview">
                        {previewContent ? (
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{previewContent}</ReactMarkdown>
                        ) : (
                          <div style={{ color: '#999' }}>预览区会实时展示左侧 Markdown 渲染结果。</div>
                        )}
                      </div>
                    </Card>
                  </div>
                </div>
              </Card>
            ),
          },
          {
            key: 'script',
            label: '剧本编辑',
            children: (
              <Card
                extra={
                  <Space>
                    <Button onClick={validateYaml}>验证 YAML</Button>
                    <Button icon={<SaveOutlined />} onClick={handleSaveScript}>
                      保存剧本
                    </Button>
                  </Space>
                }
              >
                <Editor
                  height="70vh"
                  defaultLanguage="yaml"
                  value={scriptYaml}
                  onChange={(value) => setScriptYaml(value || '')}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    wordWrap: 'on',
                  }}
                />
              </Card>
            ),
          },
        ]}
      />

        </div>

        <aside
          style={{
            position: 'sticky',
            top: 24,
            height: 'calc(100vh - 48px)',
            borderLeft: '1px solid #f0f0f0',
            paddingLeft: assistantCollapsed ? 8 : 16,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            transition: 'padding-left 0.2s ease',
          }}
        >
          {assistantCollapsed ? (
            <div
              style={{
                width: 48,
                height: '100%',
                borderRadius: 28,
                border: '1px solid #f0f0f0',
                background: '#fff',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '12px 0',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.04)',
              }}
            >
              <Button
                type="text"
                icon={<MenuUnfoldOutlined />}
                onClick={() => setAssistantCollapsed(false)}
                aria-label="展开 AI 助手"
              />
              <div
                style={{
                  writingMode: 'vertical-rl',
                  letterSpacing: 4,
                  marginTop: 16,
                  color: '#666',
                  fontWeight: 600,
                }}
              >
                AI 助手
              </div>
            </div>
          ) : (
            <div
              style={{
                flex: 1,
                minHeight: 0,
                borderRadius: 28,
                border: '1px solid #eee',
                background: '#fff',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxShadow: '0 12px 40px rgba(0, 0, 0, 0.05)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'flex-end', padding: 12 }}>
                <Button
                  type="text"
                  icon={<MenuFoldOutlined />}
                  onClick={() => setAssistantCollapsed(true)}
                  aria-label="收起 AI 助手"
                />
              </div>

              <div style={{ padding: '24px 28px 16px', textAlign: 'center' }}>
                <Space size={12} style={{ justifyContent: 'center' }}>
                  <RobotOutlined style={{ color: '#2454ff', fontSize: 26 }} />
                  <span style={{ fontSize: 24, fontWeight: 700, color: '#222' }}>你好，我是剧本助手</span>
                </Space>
              </div>

              <div style={{ flex: 1, overflow: 'auto', padding: '0 20px 12px' }}>
                <Space direction="vertical" style={{ width: '100%' }} size={10}>
                  {assistantMessages.map((msg, index) => (
                    <div key={index} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                      <div
                        style={{
                          maxWidth: '92%',
                          padding: '10px 12px',
                          borderRadius: 16,
                          background: msg.role === 'user' ? '#2454ff' : '#f6f7f9',
                          color: msg.role === 'user' ? '#fff' : '#333',
                          lineHeight: 1.7,
                        }}
                      >
                        {msg.role === 'assistant' ? (
                          <div className="markdown-preview">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content || '正在思考...'}</ReactMarkdown>
                          </div>
                        ) : (
                          msg.content
                        )}
                      </div>
                    </div>
                  ))}
                  {pendingDraft && (
                    <Card
                      size="small"
                      title="待确认修改"
                      extra={
                        <Space>
                          <Button size="small" onClick={discardAssistantDraft}>放弃</Button>
                          <Button size="small" type="primary" onClick={applyAssistantToEditor}>确认应用</Button>
                        </Space>
                      }
                      style={{ borderColor: '#d6e4ff' }}
                    >
                      <Space direction="vertical" style={{ width: '100%' }} size={8}>
                        <Space size={8}>
                          <Tag color="green">新增</Tag>
                          <Tag color="red">删除</Tag>
                        </Space>
                        <div
                          style={{
                            maxHeight: 260,
                            overflow: 'auto',
                            border: '1px solid #f0f0f0',
                            borderRadius: 8,
                            fontFamily: 'monospace',
                            fontSize: 12,
                            lineHeight: 1.7,
                          }}
                        >
                          {diffLines.map((line, index) => (
                            <div
                              key={`${line.type}-${index}`}
                              style={{
                                padding: '2px 8px',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                background:
                                  line.type === 'added' ? '#f6ffed' :
                                  line.type === 'removed' ? '#fff1f0' : 'transparent',
                                color:
                                  line.type === 'added' ? '#237804' :
                                  line.type === 'removed' ? '#a8071a' : '#555',
                                textDecoration: line.type === 'removed' ? 'line-through' : 'none',
                              }}
                            >
                              {line.type === 'added' ? '+ ' : line.type === 'removed' ? '- ' : '  '}{line.text || ' '}
                            </div>
                          ))}
                        </div>
                      </Space>
                    </Card>
                  )}
                </Space>
              </div>

              <div style={{ padding: 20 }}>
                <div
                  style={{
                    border: '1px solid #e8e8e8',
                    borderRadius: 28,
                    padding: 14,
                    background: '#fff',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.04)',
                  }}
                >
                  <Input.TextArea
                    rows={3}
                    value={assistantPrompt}
                    onChange={(e) => setAssistantPrompt(e.target.value)}
                    placeholder="向千问提问"
                    style={{ border: 'none', boxShadow: 'none', resize: 'none', padding: 0 }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                    <Space size={12}>
                      <Button type="text" size="small" icon={<CopyOutlined />} onClick={() => navigator.clipboard?.writeText(previewContent || novelContent)}>
                        复制
                      </Button>
                      <Button type="text" size="small" onClick={applyAssistantToEditor} disabled={!pendingDraft}>
                        确认应用
                      </Button>
                    </Space>
                    <Button
                      type="primary"
                      shape="circle"
                      icon={<SendOutlined />}
                      onClick={handleAssistantSend}
                      loading={assistantLoading}
                      aria-label="发送"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </aside>

      <Modal
        title="AI 多阶段生成"
        open={genModalOpen}
        onCancel={() => { if (!genRunning) setGenModalOpen(false) }}
        footer={null}
        closable={!genRunning}
        maskClosable={!genRunning}
      >
        <Steps
          direction="vertical"
          current={genSteps.findIndex((s) => s.status === 'process' || s.status === 'wait') - 1}
          items={genSteps.map((step) => ({
            title: step.title,
            description: step.detail,
            status: step.status,
            icon:
              step.status === 'process' ? <LoadingOutlined /> :
              step.status === 'finish' ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> :
              step.status === 'error' ? <CloseCircleOutlined style={{ color: '#ff4d4f' }} /> :
              undefined,
          }))}
        />

        {genError && (
          <div style={{ marginTop: 16 }}>
            <Tag color="error">生成失败</Tag>
            <div style={{ marginTop: 8, color: '#ff4d4f' }}>{genError}</div>
          </div>
        )}

        {!genRunning && !genError && (
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <Button type="primary" onClick={() => setGenModalOpen(false)}>
              查看剧本
            </Button>
          </div>
        )}
      </Modal>
    </div>
  )
}
