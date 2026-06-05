import { useMemo, useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button, Card, Collapse, Input, message, Modal, Space, Steps, Tag, Tabs, Typography } from 'antd'
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

  const handleAssistantSend = async () => {
    const prompt = assistantPrompt.trim()
    if (!prompt || !id) return
    setAssistantMessages((prev) => [...prev, { role: 'user', content: prompt }])
    setAssistantPrompt('')

    try {
      const res = await generateApi.rewrite(id, novelContent, prompt)
      const rewritten = res.data.content || ''
      if (rewritten.trim()) {
        setNovelContent(rewritten)
        setAssistantMessages((prev) => [...prev, { role: 'assistant', content: '已根据你的要求修改 Markdown，并同步更新到左侧编辑区。' }])
      } else {
        setAssistantMessages((prev) => [...prev, { role: 'assistant', content: 'AI 没有返回有效修改内容。' }])
      }
    } catch (error: any) {
      setAssistantMessages((prev) => [...prev, { role: 'assistant', content: error.response?.data?.detail || '修改失败，请稍后重试。' }])
    }
  }

  const applyAssistantToEditor = async () => {
    const prompt = assistantMessages.filter((msg) => msg.role === 'user').at(-1)?.content || assistantPrompt.trim()
    if (!prompt) {
      message.warning('请先输入 AI 指令')
      return
    }
    if (!novelContent.trim()) {
      message.warning('请先输入 Markdown 内容')
      return
    }

    try {
      const res = await generateApi.rewrite(id!, novelContent, prompt)
      const rewritten = res.data.content || ''
      if (rewritten.trim()) {
        setNovelContent(rewritten)
        setAssistantMessages((prev) => [...prev, { role: 'assistant', content: '已将修改应用到左侧编辑区，并同步更新右侧预览。' }])
      }
    } catch (error: any) {
      message.error(error.response?.data?.detail || '应用修改失败')
    }
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
    <div>
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 16, alignItems: 'start' }}>
                <Card
                  bodyStyle={{ padding: 0 }}
                  extra={<Button icon={<SaveOutlined />} onClick={handleSaveNovel}>保存小说</Button>}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: '72vh' }}>
                    <div style={{ borderRight: '1px solid #f0f0f0', padding: 16 }}>
                      <Text strong style={{ display: 'block', marginBottom: 12 }}>Markdown 原文</Text>
                      <TextArea
                        rows={30}
                        value={novelContent}
                        onChange={(e) => setNovelContent(e.target.value)}
                        placeholder="在此输入 Markdown 原文..."
                        style={{ minHeight: '64vh', resize: 'none', fontFamily: 'monospace' }}
                      />
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

                <div style={{ position: 'sticky', top: 16 }}>
                  <Collapse
                    defaultActiveKey={['assistant']}
                    items={[
                      {
                        key: 'assistant',
                        label: <Space><RobotOutlined />AI 助手</Space>,
                        children: (
                          <Card
                            bordered={false}
                            styles={{ body: { padding: 0 } }}
                            extra={
                              <Space>
                                <Button size="small" icon={<CopyOutlined />} onClick={() => navigator.clipboard?.writeText(previewContent || novelContent)}>
                                  复制内容
                                </Button>
                                <Button size="small" type="primary" onClick={applyAssistantToEditor}>
                                  应用修改
                                </Button>
                              </Space>
                            }
                          >
                            <Space direction="vertical" style={{ width: '100%' }} size={12}>
                              <div style={{ maxHeight: '42vh', overflow: 'auto', paddingRight: 4 }}>
                                <Space direction="vertical" style={{ width: '100%' }} size={10}>
                                  {assistantMessages.map((msg, index) => (
                                    <div key={index} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                                      <div
                                        style={{
                                          maxWidth: '90%',
                                          padding: '10px 12px',
                                          borderRadius: 12,
                                          background: msg.role === 'user' ? '#1677ff' : '#f5f5f5',
                                          color: msg.role === 'user' ? '#fff' : 'inherit',
                                        }}
                                      >
                                        {msg.content}
                                      </div>
                                    </div>
                                  ))}
                                </Space>
                              </div>
                              <Input.TextArea
                                rows={3}
                                value={assistantPrompt}
                                onChange={(e) => setAssistantPrompt(e.target.value)}
                                placeholder="告诉 AI 你希望怎么修改 Markdown，比如：优化标题层级、拆分段落、增强画面感..."
                              />
                              <Space>
                                <Button type="primary" icon={<SendOutlined />} onClick={handleAssistantSend}>
                                  发送
                                </Button>
                              </Space>
                            </Space>
                          </Card>
                        ),
                      },
                    ]}
                  />
                </div>
              </div>
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
