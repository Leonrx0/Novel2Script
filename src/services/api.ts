import axios from 'axios'

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json'
  }
})

export interface Novel {
  id: string
  project_id: string
  content: string | null
  created_at: string
}

export interface Script {
  id: string
  project_id: string
  content: string | null
  version: number
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  title: string
  description?: string
  generation_stage: string
  created_at: string
  updated_at: string
  novel: Novel | null
  scripts: Script[]
  characters: any[]
  rhythm_points: any[]
  generation_logs: any[]
  character_relationships: any[]
}

export interface CreateProjectData {
  title: string
  description?: string
  novel_content?: string
}

export interface UpdateProjectData {
  title?: string
  description?: string
  novel_content?: string
  script_content?: string
}

// 项目管理 API
export const projectApi = {
  list: () => api.get<Project[]>('/projects'),
  get: (id: string) => api.get<Project>(`/projects/${id}`),
  create: (data: CreateProjectData) => api.post<Project>('/projects', data),
  update: (id: string, data: Partial<UpdateProjectData>) => api.put<Project>(`/projects/${id}`, data),
  delete: (id: string) => api.delete(`/projects/${id}`),
}

// AI 生成 API
export const generateApi = {
  analyze: (projectId: string) => api.post(`/generate/analyze/${projectId}`),
  characters: (projectId: string) => api.post(`/generate/characters/${projectId}`),
  rhythm: (projectId: string) => api.post(`/generate/rhythm/${projectId}`),
  script: (projectId: string) => api.post(`/generate/script/${projectId}`),
  rewrite: (projectId: string, content: string, instruction: string) =>
    api.post(`/generate/rewrite/${projectId}`, { content, instruction }),
  assistantStreamUrl: (projectId: string) => `/api/v1/generate/assistant-stream/${projectId}`,
  stream: (projectId: string, stage: string) => {
    return new EventSource(`/api/v1/generate/stream?project_id=${projectId}&stage=${stage}`)
  }
}

export default api
