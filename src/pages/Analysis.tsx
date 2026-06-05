import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Card, Button, message, Row, Col, Statistic } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import { projectApi, generateApi } from '../services/api'
import type { Project } from '../services/api'

export default function Analysis() {
  const { id } = useParams<{ id: string }>()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (id) fetchProject(id)
  }, [id])

  const fetchProject = async (projectId: string) => {
    try {
      const res = await projectApi.get(projectId)
      setProject(res.data)
    } catch {
      message.error('获取项目失败')
    }
  }

  const handleAnalyze = async () => {
    if (!id) return
    setLoading(true)
    try {
      await generateApi.rhythm(id)
      message.success('节奏分析完成')
      await fetchProject(id)
    } catch {
      message.error('分析失败')
    } finally {
      setLoading(false)
    }
  }

  const rhythmPoints = project?.rhythm_points || []

  const chartOption = {
    title: { text: '剧情节奏曲线', left: 'center' },
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const p = params[0]
        const point = rhythmPoints[p.dataIndex]
        return `${point?.label || ''}<br/>强度: ${p.value}<br/>${point?.description || ''}`
      },
    },
    xAxis: {
      type: 'category',
      data: rhythmPoints.map((p: any) => p.label),
      axisLabel: { rotate: 30 },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 10,
      name: '强度',
    },
    series: [
      {
        name: '剧情强度',
        type: 'line',
        data: rhythmPoints.map((p: any) => p.intensity),
        smooth: true,
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(24, 144, 255, 0.6)' },
              { offset: 1, color: 'rgba(24, 144, 255, 0.1)' },
            ],
          },
        },
        lineStyle: { color: '#1890ff', width: 3 },
        itemStyle: { color: '#1890ff' },
        markPoint: {
          data: [
            { type: 'max', name: '高潮' },
            { type: 'min', name: '低谷' },
          ],
        },
      },
    ],
    grid: { left: '10%', right: '10%', bottom: '15%' },
  }

  const barOption = {
    title: { text: '情节分布', left: 'center' },
    tooltip: { trigger: 'item' },
    xAxis: {
      type: 'value',
      max: 1,
      name: '故事进度',
    },
    yAxis: {
      type: 'category',
      data: rhythmPoints.map((p: any) => p.label),
    },
    series: [
      {
        type: 'bar',
        data: rhythmPoints.map((p: any) => ({
          value: p.position,
          itemStyle: {
            color: p.intensity >= 7 ? '#f5222d' : p.intensity >= 4 ? '#faad14' : '#52c41a',
          },
        })),
        label: { show: true, position: 'right', formatter: '{c}%' },
      },
    ],
  }

  const avgIntensity = rhythmPoints.length
    ? (rhythmPoints.reduce((sum: number, p: any) => sum + p.intensity, 0) / rhythmPoints.length).toFixed(1)
    : '0'
  const maxIntensity = rhythmPoints.length
    ? Math.max(...rhythmPoints.map((p: any) => p.intensity))
    : 0
  const minIntensity = rhythmPoints.length
    ? Math.min(...rhythmPoints.map((p: any) => p.intensity))
    : 0

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2>剧情节奏分析：{project?.title || '...'}</h2>
        <Button icon={<ReloadOutlined />} type="primary" onClick={handleAnalyze} loading={loading}>
          AI 分析节奏
        </Button>
      </div>

      {rhythmPoints.length > 0 ? (
        <>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={8}>
              <Card>
                <Statistic title="平均强度" value={avgIntensity} suffix="/ 10" />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="最高强度" value={maxIntensity} suffix="/ 10" valueStyle={{ color: '#cf1322' }} />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="最低强度" value={minIntensity} suffix="/ 10" valueStyle={{ color: '#3f8600' }} />
              </Card>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={16}>
              <Card>
                <ReactECharts option={chartOption} style={{ height: 400 }} />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <ReactECharts option={barOption} style={{ height: 400 }} />
              </Card>
            </Col>
          </Row>
        </>
      ) : (
        <Card>
          <div style={{ textAlign: 'center', padding: 48 }}>
            <p style={{ marginBottom: 16 }}>暂无节奏分析数据</p>
            <Button type="primary" onClick={handleAnalyze} loading={loading}>
              开始 AI 分析
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
