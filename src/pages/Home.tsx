import { Card, Row, Col, Steps, Typography, Button } from 'antd'
import { useNavigate } from 'react-router-dom'
import {
  FileTextOutlined,
  TeamOutlined,
  BarChartOutlined,
  EditOutlined,
  DownloadOutlined,
} from '@ant-design/icons'

const { Title, Paragraph } = Typography

export default function Home() {
  const navigate = useNavigate()

  const features = [
    {
      title: '多阶段 AI 生成',
      desc: '分析 → 人物提取 → 节奏分析 → 剧本生成，分阶段精细化处理',
      icon: <FileTextOutlined />,
    },
    {
      title: '人物关系图',
      desc: 'ReactFlow 可视化展示角色关系网络',
      icon: <TeamOutlined />,
    },
    {
      title: '剧情节奏分析',
      desc: '直观展示故事高潮低谷分布',
      icon: <BarChartOutlined />,
    },
    {
      title: '在线编辑 + YAML 导出',
      desc: 'Monaco Editor 专业编辑，一键导出标准 YAML',
      icon: <EditOutlined />,
    },
  ]

  return (
    <div>
      <Title>小说转剧本 AI 平台</Title>
      <Paragraph type="secondary">
        基于 Qwen API 的多阶段智能生成工具，将您的小说一键转换为专业剧本格式（YAML）。
      </Paragraph>

      <Button
        type="primary"
        size="large"
        onClick={() => navigate('/projects')}
        style={{ marginBottom: 32 }}
      >
        开始新项目
      </Button>

      <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
        {features.map((f, i) => (
          <Col span={12} key={i}>
            <Card title={f.title} extra={f.icon}>
              {f.desc}
            </Card>
          </Col>
        ))}
      </Row>

      <Card title="生成流程">
        <Steps
          direction="vertical"
          current={-1}
          items={[
            { title: '输入小说', description: '粘贴或上传小说文本' },
            { title: '结构分析', description: 'AI 分析故事主题与结构' },
            { title: '人物提取', description: '自动识别角色及关系' },
            { title: '节奏分析', description: '标注关键情节与强度' },
            { title: '剧本生成', description: '输出 YAML 格式剧本' },
            { title: '在线编辑导出', description: 'Monaco 编辑器精修并导出' },
          ]}
        />
      </Card>
    </div>
  )
}
