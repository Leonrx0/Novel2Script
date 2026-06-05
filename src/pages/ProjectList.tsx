import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Dropdown, message, Popconfirm, Table, type MenuProps, Space } from 'antd'
import type { TableColumnsType } from 'antd'
import { BarChartOutlined, DeleteOutlined, EditOutlined, MoreOutlined, PlusOutlined, TeamOutlined } from '@ant-design/icons'
import { projectApi, type Project } from '../services/api'

export default function ProjectList() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const fetchProjects = async () => {
    setLoading(true)
    try {
      const res = await projectApi.list()
      setProjects(res.data)
    } catch {
      message.error('获取项目列表失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [])

  const handleDelete = async (id: string) => {
    try {
      await projectApi.delete(id)
      message.success('删除成功')
      fetchProjects()
    } catch {
      message.error('删除失败')
    }
  }

  const columns: TableColumnsType<Project> = [
    { title: '标题', dataIndex: 'title', key: 'title' },
    { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true },
    { title: '创建时间', dataIndex: 'created_at', key: 'created_at', render: (v: string) => new Date(v).toLocaleString() },
    {
      title: '操作',
      key: 'action',
      width: 280,
      align: 'left',
      render: (_: unknown, record: Project) => {
        const items: MenuProps['items'] = [
          {
            key: 'characters',
            icon: <TeamOutlined />,
            label: '人物',
            onClick: () => navigate(`/characters/${record.id}`),
          },
          {
            key: 'analysis',
            icon: <BarChartOutlined />,
            label: '分析',
            onClick: () => navigate(`/analysis/${record.id}`),
          },
        ]

        return (
          <Space size={8}>
            <Button
              type="default"
              icon={<EditOutlined />}
              onClick={() => navigate(`/editor/${record.id}`)}
              style={{
                borderRadius: 12,
                paddingInline: 18,
                height: 40,
                boxShadow: 'none',
              }}
            >
              编辑
            </Button>
            <Popconfirm
              title="确认删除？"
              description="删除后无法恢复，确定要继续吗？"
              okText="删除"
              okButtonProps={{ danger: true }}
              cancelText="取消"
              onConfirm={() => handleDelete(record.id)}
            >
              <Button
                danger
                type="default"
                icon={<DeleteOutlined />}
                style={{
                  borderRadius: 12,
                  paddingInline: 18,
                  height: 40,
                  boxShadow: 'none',
                }}
              >

                删除
              </Button>
            </Popconfirm>
            <Dropdown menu={{ items }} trigger={['click']} placement="bottomRight">
              <Button type="text" icon={<MoreOutlined />} aria-label="更多操作" />
            </Dropdown>
          </Space>
        )
      },
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2>项目管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/create')}>
          新建项目
        </Button>
      </div>

      <Table<Project> rowKey="id" columns={columns} dataSource={projects} loading={loading} />
    </div>
  )
}
