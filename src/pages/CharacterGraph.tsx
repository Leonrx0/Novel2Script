import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { Card, message, Button } from 'antd'
import { ReloadOutlined, UndoOutlined } from '@ant-design/icons'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  Node,
  Edge,
  ReactFlowProvider,
  NodeTypes,
  MarkerType,
  Panel,
} from 'reactflow'
import 'reactflow/dist/style.css'
import CharacterNode from '../components/CharacterNode'
import { projectApi, generateApi } from '../services/api'
import type { Project } from '../services/api'
import api from '../services/api'

const nodeTypes: NodeTypes = {
  character: CharacterNode,
}

/* ─── 关系样式映射 ─── */
interface EdgeConfig {
  stroke: string
  width: number
  dash?: string      // e.g. "5,5" for dashed
  arrow?: 'start' | 'end' | 'bidirectional' | undefined
  animated: boolean
}

function getEdgeConfig(relationType: string): EdgeConfig {
  const t = (relationType || '').toLowerCase()

  // 对称关系：无端点实线
  if (t.includes('恋人') || t.includes('夫妻') || t.includes('配偶') || t.includes('爱人') || t.includes('订婚')) {
    return { stroke: '#ff4d4f', width: 1.5, dash: undefined, arrow: undefined, animated: false }
  }
  if (t.includes('家人') || t.includes('父母') || t.includes('兄弟') || t.includes('姐妹') || t.includes('亲子')) {
    return { stroke: '#ff7875', width: 1.5, dash: undefined, arrow: undefined, animated: false }
  }
  if (t.includes('朋友') || t.includes('同伴') || t.includes('同事') || t.includes('师徒')) {
    return { stroke: '#52c41a', width: 1.5, dash: undefined, arrow: undefined, animated: false }
  }
  // 非对称关系：带单向箭头
  if (t.includes('敌人') || t.includes('敌对') || t.includes('冲突') || t.includes('竞争') || t.includes('杀害')) {
    return { stroke: '#ff7a45', width: 1.5, dash: '5,5', arrow: 'end', animated: true }
  }
  if (t.includes('帮助') || t.includes('保护') || t.includes('守护') || t.includes('求助') || t.includes('协助') || t.includes('支持')) {
    return { stroke: '#1890ff', width: 1.5, dash: '5,5', arrow: 'end', animated: true }
  }
  if (t.includes('上下级') || t.includes('领导') || t.includes('下属') || t.includes('上司')) {
    return { stroke: '#722ed1', width: 1.5, dash: '2,2', arrow: 'end', animated: false }
  }
  // 案件 / 当事人 / 调查 … 默认虚线
  return { stroke: '#8c8c8c', width: 1.5, dash: '4,4', arrow: undefined, animated: false }
}

/* ─── 图例数据 ─── */
const LEGEND_ITEMS: { label: string; config: EdgeConfig }[] = [
  { label: '恋人 / 家人', config: { stroke: '#ff4d4f', width: 1.5, dash: undefined, arrow: undefined, animated: false } },
  { label: '朋友 / 师徒', config: { stroke: '#52c41a', width: 1.5, dash: undefined, arrow: undefined, animated: false } },
  { label: '帮助 / 保护', config: { stroke: '#1890ff', width: 1.5, dash: '5,5', arrow: 'end', animated: true } },
  { label: '敌人 / 冲突', config: { stroke: '#ff7a45', width: 1.5, dash: '5,5', arrow: 'end', animated: true } },
  { label: '上下级',      config: { stroke: '#722ed1', width: 1.5, dash: '2,2', arrow: 'end', animated: false } },
  { label: '其他',        config: { stroke: '#8c8c8c', width: 1.5, dash: '4,4', arrow: undefined, animated: false } },
]

function LegendPanel() {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.95)',
        border: '1px solid #e8e8e8',
        borderRadius: 8,
        padding: '12px 16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        fontSize: 12,
        minWidth: 140,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 13 }}>关系图例</div>
      {LEGEND_ITEMS.map((item) => (
        <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <svg width="30" height="10">
            <line
              x1="0"
              y1="5"
              x2="26"
              y2="5"
              stroke={item.config.stroke}
              strokeWidth={item.config.width}
              strokeDasharray={item.config.dash}
            />
            {item.config.arrow === 'end' && (
              <polygon points="26,5 20,2 20,8" fill={item.config.stroke} />
            )}
          </svg>
          <span style={{ color: '#555', whiteSpace: 'nowrap' }}>{item.label}</span>
        </div>
      ))}
    </div>
  )
}

function GraphContent({
  characters,
  relationships,
  projectId,
  onAvatarChange,
  resetKey,
}: {
  characters: any[]
  relationships: any[]
  projectId: string
  onAvatarChange: (charId: string, avatar: string) => void
  resetKey: number
}) {
  const { fitView } = useReactFlow()
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const hasSavedPos = useRef(false)

  const storageKey = `charGraph-pos-${projectId}`

  // 节点拖拽停止时保存所有节点位置
  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, _node: Node, allNodes: Node[]) => {
      const positions: Record<string, { x: number; y: number }> = {}
      allNodes.forEach((n) => {
        positions[n.id] = n.position
      })
      localStorage.setItem(storageKey, JSON.stringify(positions))
      hasSavedPos.current = true
    },
    [storageKey]
  )

  useEffect(() => {
    const savedRaw = localStorage.getItem(storageKey)
    const savedPositions: Record<string, { x: number; y: number }> = savedRaw ? JSON.parse(savedRaw) : {}

    const newNodes: Node[] = characters.map((char, index) => {
      const charId = String(char.id || `char_${index}`)
      const defaultPos = { x: 200 + (index % 4) * 280, y: 100 + Math.floor(index / 4) * 220 }
      return {
        id: charId,
        type: 'character',
        data: {
          label: char.name,
          description: char.description || '',
          avatar: char.avatar,
          charId,
          projectId,
          onAvatarChange,
        },
        position: savedPositions[charId] || defaultPos,
      }
    })

    // 按 source-target 分组，合并同一对角色间的多个关系
    const edgeMap = new Map<string, any[]>()
    relationships
      .filter((rel) => rel.source_id && rel.target_id)
      .forEach((rel) => {
        const key = `${rel.source_id}-${rel.target_id}`
        if (!edgeMap.has(key)) edgeMap.set(key, [])
        edgeMap.get(key)!.push(rel)
      })

    // 节点位置映射，用于智能选择连接手柄
    const posMap = new Map<string, { x: number; y: number }>()
    newNodes.forEach((n) => posMap.set(n.id, n.position))

    const newEdges: Edge[] = Array.from(edgeMap.entries()).map(([key, rels], index) => {
      const source_id = rels[0].source_id
      const target_id = rels[0].target_id
      const allTypes = [...new Set(rels.map((r) => r.relation_type).filter(Boolean))].join(' / ')
      const cfg = getEdgeConfig(allTypes)

      // 根据相对位置选择最优手柄，使贝塞尔曲线更自然
      const srcPos = posMap.get(String(source_id))
      const tgtPos = posMap.get(String(target_id))
      let sourceHandle = 's-bottom'
      let targetHandle = 't-top'
      if (srcPos && tgtPos) {
        const dx = tgtPos.x - srcPos.x
        const dy = tgtPos.y - srcPos.y
        if (Math.abs(dx) > Math.abs(dy)) {
          sourceHandle = dx > 0 ? 's-right' : 's-left'
          targetHandle = dx > 0 ? 't-left' : 't-right'
        }
      }

      const edge: Edge = {
        id: `e-${index}`,
        source: String(source_id),
        target: String(target_id),
        sourceHandle,
        targetHandle,
        label: allTypes,
        animated: cfg.animated,
        style: {
          stroke: cfg.stroke,
          strokeWidth: cfg.width,
          strokeDasharray: cfg.dash,
        },
        labelStyle: {
          fill: '#333',
          fontWeight: 600,
          fontSize: 12,
        },
        labelBgStyle: {
          fill: '#fff',
          fillOpacity: 0.95,
        },
        labelBgPadding: [4, 6],
        labelBgBorderRadius: 4,
      }
      if (cfg.arrow === 'end') {
        edge.markerEnd = { type: MarkerType.ArrowClosed, color: cfg.stroke }
      }
      return edge
    })

    setNodes(newNodes)
    setEdges(newEdges)

    // 重置布局后自动适配视图
    if (resetKey > 0) {
      setTimeout(() => fitView({ padding: 0.2 }), 50)
    }
  }, [characters, relationships, projectId, onAvatarChange, resetKey, storageKey, setNodes, setEdges, fitView])

  if (characters.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <span>暂无人物数据</span>
      </div>
    )
  }

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeDragStop={onNodeDragStop}
      fitView={resetKey === 0 && !hasSavedPos.current}
      style={{ width: '100%', height: '100%' }}
    >
      <Background />
      <Controls />
      <MiniMap nodeStrokeWidth={3} zoomable pannable />
      <Panel position="bottom-left">
        <LegendPanel />
      </Panel>
    </ReactFlow>
  )
}

export default function CharacterGraph() {
  const { id } = useParams<{ id: string }>()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(false)
  const [resetKey, setResetKey] = useState(0)

  useEffect(() => {
    if (id) fetchProject(id)
  }, [id])

  const fetchProject = async (projectId: string) => {
    try {
      const res = await projectApi.get(projectId)
      setProject(res.data)
    } catch (err: any) {
      message.error('获取项目失败: ' + (err.response?.data?.detail || err.message))
    }
  }

  const handleAvatarChange = useCallback(
    async (charId: string, avatar: string) => {
      if (!id) return
      try {
        await api.put(`/projects/${id}/characters/${charId}`, { avatar })
        await fetchProject(id)
        message.success('头像已保存')
      } catch (err: any) {
        message.error('保存头像失败: ' + (err.response?.data?.detail || err.message))
      }
    },
    [id]
  )

  const handleExtract = async () => {
    if (!id) return
    setLoading(true)
    try {
      await generateApi.characters(id)
      message.success('人物关系提取完成')
      await fetchProject(id)
    } catch (err: any) {
      message.error('提取失败: ' + (err.response?.data?.detail || err.message))
    } finally {
      setLoading(false)
    }
  }

  const handleResetLayout = () => {
    if (!id) return
    localStorage.removeItem(`charGraph-pos-${id}`)
    setResetKey((k) => k + 1)
    message.success('布局已重置')
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2>人物关系图：{project?.title || '...'}</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button icon={<UndoOutlined />} onClick={handleResetLayout}>
            重置布局
          </Button>
          <Button icon={<ReloadOutlined />} type="primary" onClick={handleExtract} loading={loading}>
            AI 提取人物
          </Button>
        </div>
      </div>

      <Card bodyStyle={{ padding: 0, height: '70vh' }} style={{ height: '70vh', position: 'relative' }}>
        <ReactFlowProvider>
          {id && (
            <GraphContent
              characters={project?.characters || []}
              relationships={project?.character_relationships || []}
              projectId={id}
              onAvatarChange={handleAvatarChange}
              resetKey={resetKey}
            />
          )}
        </ReactFlowProvider>
      </Card>
    </div>
  )
}
