import { Layout as AntLayout, Button, Menu, Tooltip, Typography } from 'antd'
import { useNavigate, useLocation } from 'react-router-dom'
import type { MenuProps } from 'antd'
import {
  HomeOutlined,
  TeamOutlined,
  BarChartOutlined,
  EditOutlined,
  ProjectOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons'
import { ReactNode, useMemo, useState } from 'react'

const { Header, Sider, Content } = AntLayout
const { Title } = Typography

interface LayoutProps {
  children: ReactNode
}

/** 从路径中提取项目 UUID */
function extractProjectId(path: string): string | null {
  const match = path.match(/^\/(editor|characters|analysis)\/([a-f0-9\-]{36})$/i)
  return match ? match[2] : null
}

export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const currentId = extractProjectId(location.pathname)

  const primarySelected = useMemo(() => {
    const path = location.pathname
    if (path === '/') return '/'
    if (path.startsWith('/projects')) return '/projects'
    return ''
  }, [location.pathname])

  const projectSelected = useMemo(() => {
    if (!currentId) return ''
    const path = location.pathname
    if (path === `/editor/${currentId}`) return 'editor'
    if (path === `/characters/${currentId}`) return 'characters'
    if (path === `/analysis/${currentId}`) return 'analysis'
    return ''
  }, [location.pathname, currentId])

  const primaryItems: MenuProps['items'] = [
    { key: '/', icon: <HomeOutlined />, label: '首页' },
    { key: '/projects', icon: <ProjectOutlined />, label: '项目管理' },
  ]

  const projectItems: MenuProps['items'] = currentId
    ? [
        { key: 'editor', icon: <EditOutlined />, label: '剧本编辑' },
        { key: 'characters', icon: <TeamOutlined />, label: '人物关系' },
        { key: 'analysis', icon: <BarChartOutlined />, label: '剧情分析' },
      ]
    : []

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <AntLayout>
        <Sider
          collapsible
          collapsed={collapsed}
          trigger={null}
          width={160}
          collapsedWidth={64}
          theme="dark"
          style={{ overflow: 'auto', position: 'relative' }}
        >
          <div style={{ display: 'flex', justifyContent: collapsed ? 'center' : 'flex-end', padding: '12px 12px 8px',backgroundColor:'#fff' }}>
            <Tooltip title={collapsed ? '展开侧边栏' : '收起侧边栏'} placement="right">
              <Button
                type="text"
                icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                onClick={() => setCollapsed((v) => !v)}
                style={{ color: '#000' }}
              />
            </Tooltip>
          </div>
          <Menu
            mode="inline"
            selectedKeys={primarySelected ? [primarySelected] : []}
            style={{ height: '100%', borderRight: 0 }}
            items={primaryItems}
            onClick={({ key }) => navigate(key)}
          />
        </Sider>

        {currentId && (
          <Sider
            width={180}
            collapsedWidth={64}
            collapsible
            collapsed={collapsed}
            trigger={null}
            theme="light"
            style={{ borderRight: '1px solid #f0f0f0', overflow: 'auto' }}
          >
            {!collapsed && (
              <div style={{ padding: '16px 0 8px 16px', fontSize: 12, color: '#999', fontWeight: 600 }}>
                项目工具
              </div>
            )}
            <Menu
              mode="inline"
              selectedKeys={projectSelected ? [projectSelected] : []}
              style={{ height: '100%', borderRight: 0 }}
              items={projectItems}
              onClick={({ key }) => navigate(`/${key}/${currentId}`)}
            />
          </Sider>
        )}

        <AntLayout style={{ padding: '24px' }}>
          <Content
            style={{
              padding: 24,
              margin: 0,
              minHeight: 280,
              background: '#fff',
              borderRadius: 8,
            }}
          >
            {children}
          </Content>
        </AntLayout>
      </AntLayout>
    </AntLayout>
  )
}
