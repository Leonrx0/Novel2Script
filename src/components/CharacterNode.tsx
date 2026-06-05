import { useCallback, useState } from 'react'
import { Handle, Position } from 'reactflow'
import { Popover, Modal, Upload, Button, message } from 'antd'
import { UploadOutlined, UserOutlined } from '@ant-design/icons'
import type { UploadFile } from 'antd/es/upload/interface'

interface CharacterNodeData {
  label: string
  description: string
  avatar?: string
  charId: string
  projectId: string
  onAvatarChange?: (charId: string, avatar: string) => void
}

export default function CharacterNode({ data }: { data: CharacterNodeData }) {
  const [modalOpen, setModalOpen] = useState(false)
  const [preview, setPreview] = useState<string>(data.avatar || '')
  const [fileList, setFileList] = useState<UploadFile[]>([])

  const handleOpen = useCallback(() => {
    setPreview(data.avatar || '')
    setFileList([])
    setModalOpen(true)
  }, [data.avatar])

  const handleUpload = (info: any) => {
    const file = info.fileList[0]?.originFileObj as File
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      const base64 = e.target?.result as string
      setPreview(base64)
      setFileList([{ uid: '-1', name: file.name, status: 'done', url: base64 }])
    }
    reader.readAsDataURL(file)
  }

  const handleSave = () => {
    if (preview && data.onAvatarChange) {
      data.onAvatarChange(data.charId, preview)
      message.success('头像已更新')
    }
    setModalOpen(false)
  }

  const popoverContent = (
    <div style={{ maxWidth: 240 }}>
      <div style={{ fontSize: 15, fontWeight: 'bold', marginBottom: 6 }}>{data.label}</div>
      <div style={{ color: '#666', fontSize: 13, lineHeight: 1.6 }}>
        {data.description || '暂无描述'}
      </div>
    </div>
  )

  return (
    <>
      <Popover content={popoverContent} title="角色详情" trigger="hover" placement="top">
        <div
          onClick={handleOpen}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6,
            cursor: 'pointer',
            padding: 4,
            minWidth: 100,
          }}
        >
          <Handle type="target" position={Position.Top} id="t-top" style={{ background: 'transparent', width: 1, height: 1, border: 'none' }} />
          <Handle type="target" position={Position.Left} id="t-left" style={{ background: 'transparent', width: 1, height: 1, border: 'none' }} />
          <Handle type="target" position={Position.Right} id="t-right" style={{ background: 'transparent', width: 1, height: 1, border: 'none' }} />

          {data.avatar ? (
            <img
              src={data.avatar}
              alt={data.label}
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2px solid #1890ff',
              }}
            />
          ) : (
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: '#f0f0f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px dashed #ccc',
              }}
            >
              <UserOutlined style={{ fontSize: 28, color: '#999' }} />
            </div>
          )}
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: '#333',
              maxWidth: 120,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {data.label}
          </span>

          <Handle type="source" position={Position.Bottom} id="s-bottom" style={{ background: 'transparent', width: 1, height: 1, border: 'none' }} />
          <Handle type="source" position={Position.Left} id="s-left" style={{ background: 'transparent', width: 1, height: 1, border: 'none' }} />
          <Handle type="source" position={Position.Right} id="s-right" style={{ background: 'transparent', width: 1, height: 1, border: 'none' }} />
        </div>
      </Popover>

      <Modal
        title={`编辑角色：${data.label}`}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        okText="保存"
        cancelText="取消"
      >
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          {preview ? (
            <img
              src={preview}
              alt="预览"
              style={{ width: 120, height: 120, borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : (
            <div
              style={{
                width: 120,
                height: 120,
                borderRadius: '50%',
                background: '#f0f0f0',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
              }}
            >
              <UserOutlined style={{ fontSize: 48, color: '#999' }} />
            </div>
          )}
        </div>
        <Upload
          fileList={fileList}
          beforeUpload={() => false}
          onChange={handleUpload}
          maxCount={1}
          accept="image/*"
          showUploadList={false}
        >
          <Button icon={<UploadOutlined />}>上传头像</Button>
        </Upload>
      </Modal>
    </>
  )
}
