import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card,
  Form,
  Input,
  Button,
  Steps,
  Collapse,
  message,
  Space,
  Divider,
  Typography,
} from 'antd'
import {
  PlusOutlined,
  DeleteOutlined,
  ArrowRightOutlined,
  SaveOutlined,
  BookOutlined,
} from '@ant-design/icons'
import { projectApi } from '../services/api'

const { Panel } = Collapse
const { Title, Text } = Typography
const { TextArea } = Input

interface Chapter {
  id: number
  title: string
  content: string
}

export default function CreateProject() {
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [currentStep, setCurrentStep] = useState(0)
  const [projectInfo, setProjectInfo] = useState({ title: '', description: '' })
  const [chapters, setChapters] = useState<Chapter[]>([
    { id: 0, title: '', content: '' },
  ])
  const [loading, setLoading] = useState(false)

  const addChapter = () => {
    setChapters((prev) => [
      ...prev,
      { id: Date.now(), title: '', content: '' },
    ])
  }

  const removeChapter = (index: number) => {
    if (chapters.length <= 1) {
      message.warning('至少保留一个章节')
      return
    }
    setChapters((prev) => prev.filter((_, i) => i !== index))
  }

  const updateChapter = (index: number, field: 'title' | 'content', value: string) => {
    setChapters((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const handleSubmit = async () => {
    const emptyContent = chapters.some((c) => !c.content.trim())
    if (emptyContent) {
      message.warning('请填写所有章节内容')
      return
    }
    const emptyTitle = chapters.some((c) => !c.title.trim())
    if (emptyTitle) {
      message.warning('请为每一章填写章节标题')
      return
    }
    if (!projectInfo.title.trim()) {
      message.warning('请输入小说标题')
      setCurrentStep(0)
      return
    }

    setLoading(true)
    try {
      const novelContent = chapters
        .map((c) => `## ${c.title}\n\n${c.content}`)
        .join('\n\n---\n\n')

      const res = await projectApi.create({
        title: projectInfo.title,
        description: projectInfo.description,
        novel_content: novelContent,
      })

      message.success('项目创建成功')
      navigate(`/editor/${res.data.id}`)
    } catch {
      message.error('创建失败')
    } finally {
      setLoading(false)
    }
  }

  const steps = [
    {
      title: '基本信息',
      content: (
        <Card>
          <Form form={form} layout="vertical" initialValues={projectInfo}>
            <Form.Item
              name="title"
              label="小说标题"
              rules={[{ required: true, message: '请输入小说标题' }]}
            >
              <Input placeholder="例如：西游记" size="large" prefix={<BookOutlined />} />
            </Form.Item>
            <Form.Item name="description" label="简介">
              <TextArea
                rows={4}
                placeholder="简要描述小说内容、风格、背景..."
              />
            </Form.Item>
          </Form>
          <div style={{ textAlign: 'right' }}>
            <Button
              type="primary"
              onClick={async () => {
                try {
                  const values = await form.validateFields()
                  setProjectInfo({
                    title: values.title,
                    description: values.description || '',
                  })
                  setCurrentStep(1)
                } catch {
                  // 验证失败，留在当前步骤
                }
              }}
            >
              下一步 <ArrowRightOutlined />
            </Button>
          </div>
        </Card>
      ),
    },
    {
      title: '章节录入',
      content: (
        <Card>
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            {chapters.map((chapter, index) => (
              <Card
                key={chapter.id}
                size="small"
                title={
                  <Space>
                    <Text strong>第 {index + 1} 章</Text>
                    <Input
                      placeholder="章节标题（必填）"
                      value={chapter.title}
                      onChange={(e) => updateChapter(index, 'title', e.target.value)}
                      style={{ width: 300 }}
                      variant="borderless"
                    />
                  </Space>
                }
                extra={
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => removeChapter(index)}
                  />
                }
              >
                <TextArea
                  rows={10}
                  value={chapter.content}
                  onChange={(e) => updateChapter(index, 'content', e.target.value)}
                  placeholder={`在此粘贴第 ${index + 1} 章的小说内容...`}
                />
              </Card>
            ))}

            <Button type="dashed" block icon={<PlusOutlined />} onClick={addChapter}>
              添加新章节
            </Button>

            <Divider />

            <Space>
              <Button onClick={() => setCurrentStep(0)}>上一步</Button>
              <Button type="primary" icon={<SaveOutlined />} onClick={handleSubmit} loading={loading}>
                创建项目
              </Button>
            </Space>
          </Space>
        </Card>
      ),
    },
  ]

  return (
    <div>
      <Title level={3}>新建项目</Title>
      <Text type="secondary">将您的小说分章节录入，系统将自动转译为专业剧本。</Text>

      <Steps
        current={currentStep}
        items={steps.map((s) => ({ title: s.title }))}
        style={{ margin: '24px 0' }}
      />

      {steps[currentStep].content}
    </div>
  )
}
