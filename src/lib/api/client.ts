import { authFetch } from '@/lib/utils/auth-fetch'
import type {
  TaskWithProfiles,
  FileWithUploader,
  ClientWithOrganization,
  User,
  WorkstreamVertical,
  WorkstreamTemplateWithVertical,
  ClientWorkstreamWithDetails,
} from '@/types/entities'
import type {
  CreateTaskInput,
  UpdateTaskInput,
  InviteUserInput,
  UpdateProfileInput,
  ChangePasswordInput,
  CreateWorkstreamTemplateInput,
  UpdateWorkstreamTemplateInput,
  AssignWorkstreamInput,
  UpdateClientWorkstreamInput,
} from '@/types/schemas'

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: any
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

class ApiClient {
  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const response = await authFetch(endpoint, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }))
      throw new ApiError(
        response.status,
        error.error || 'Request failed',
        error.details
      )
    }

    const data = await response.json()
    return data.success !== false ? data.data || data : data
  }

  // Tasks
  async getTasks(filters?: { view?: string; assignee?: string; status?: string }) {
    const params = new URLSearchParams()
    if (filters?.view) params.set('view', filters.view)
    if (filters?.assignee) params.set('assignee', filters.assignee)
    if (filters?.status) params.set('status', filters.status)

    return this.request<{ tasks: TaskWithProfiles[] }>(`/api/tasks?${params}`)
  }

  async getTask(id: string) {
    return this.request<{ task: TaskWithProfiles }>(`/api/tasks?id=${id}`)
  }

  async createTask(data: CreateTaskInput) {
    return this.request<{ task: TaskWithProfiles }>('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateTask(id: string, data: UpdateTaskInput) {
    return this.request<{ task: TaskWithProfiles }>(`/api/tasks?id=${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async deleteTask(id: string) {
    return this.request<{ message: string }>(`/api/tasks?id=${id}`, {
      method: 'DELETE',
    })
  }

  // Files
  async getFiles(folderPath: string = '/', view: string = 'all') {
    return this.request<{ files: FileWithUploader[]; view: string; folderPath: string }>(
      `/api/files?folderPath=${encodeURIComponent(folderPath)}&view=${view}`
    )
  }

  async deleteFile(id: string) {
    return this.request<{ message: string }>(`/api/files?id=${id}`, {
      method: 'DELETE',
    })
  }

  async uploadFile(formData: FormData) {
    const response = await authFetch('/api/files-upload', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }))
      throw new ApiError(response.status, error.error || 'Upload failed', error.details)
    }

    return response.json()
  }

  async shareFile(fileId: string, userIds: string[], permission: string = 'view') {
    return this.request<{ message: string }>('/api/files-share', {
      method: 'POST',
      body: JSON.stringify({ fileId, userIds, permission }),
    })
  }

  async getFilePermissions(fileId: string) {
    return this.request<{ permissions: any[] }>(`/api/files-share?fileId=${fileId}`)
  }

  // Users
  async getClients() {
    return this.request<{ clients: ClientWithOrganization[]; clientsByOrg: Record<string, ClientWithOrganization[]> }>(
      '/api/users-clients'
    )
  }

  async inviteUser(data: InviteUserInput) {
    return this.request<{ user: User }>('/api/users-invite', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateUserProfile(data: UpdateProfileInput) {
    return this.request<{ profile: User }>('/api/users-profile-update', {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async changePassword(data: ChangePasswordInput) {
    return this.request<{ message: string }>('/api/users-password-change', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // Workstreams - Verticals (reference data)
  async getWorkstreamVerticals() {
    return this.request<{ verticals: WorkstreamVertical[] }>('/api/workstream-verticals')
  }

  // Workstreams - Templates (admin only)
  async getWorkstreamTemplates(filters?: {
    vertical_id?: string
    timing?: string
    is_active?: boolean
    search?: string
  }) {
    const params = new URLSearchParams()
    if (filters?.vertical_id) params.set('vertical_id', filters.vertical_id)
    if (filters?.timing) params.set('timing', filters.timing)
    if (filters?.is_active !== undefined) params.set('is_active', String(filters.is_active))
    if (filters?.search) params.set('search', filters.search)

    return this.request<{ templates: WorkstreamTemplateWithVertical[] }>(
      `/api/workstreams?${params}`
    )
  }

  async getWorkstreamTemplate(id: string) {
    return this.request<{ template: WorkstreamTemplateWithVertical }>(
      `/api/workstreams?id=${id}`
    )
  }

  async createWorkstreamTemplate(data: CreateWorkstreamTemplateInput) {
    return this.request<{ template: WorkstreamTemplateWithVertical }>('/api/workstreams', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateWorkstreamTemplate(id: string, data: UpdateWorkstreamTemplateInput) {
    return this.request<{ template: WorkstreamTemplateWithVertical }>(
      `/api/workstreams?id=${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      }
    )
  }

  async deleteWorkstreamTemplate(id: string) {
    return this.request<{ message: string }>(`/api/workstreams?id=${id}`, {
      method: 'DELETE',
    })
  }

  // Workstreams - Client Assignments
  async getClientWorkstreams(filters?: {
    org_id?: string
    status?: string
    point_person_id?: string
    is_active?: boolean
  }) {
    const params = new URLSearchParams()
    if (filters?.org_id) params.set('org_id', filters.org_id)
    if (filters?.status) params.set('status', filters.status)
    if (filters?.point_person_id) params.set('point_person_id', filters.point_person_id)
    if (filters?.is_active !== undefined) params.set('is_active', String(filters.is_active))

    return this.request<{ workstreams: ClientWorkstreamWithDetails[] }>(
      `/api/client-workstreams?${params}`
    )
  }

  async getClientWorkstream(id: string) {
    return this.request<{ workstream: ClientWorkstreamWithDetails }>(
      `/api/client-workstreams?id=${id}`
    )
  }

  async assignWorkstream(data: AssignWorkstreamInput) {
    return this.request<{ workstream: ClientWorkstreamWithDetails }>(
      '/api/client-workstreams',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    )
  }

  async updateClientWorkstream(id: string, data: UpdateClientWorkstreamInput) {
    return this.request<{ workstream: ClientWorkstreamWithDetails }>(
      `/api/client-workstreams?id=${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      }
    )
  }

  async removeClientWorkstream(id: string) {
    return this.request<{ message: string }>(`/api/client-workstreams?id=${id}`, {
      method: 'DELETE',
    })
  }
}

export const apiClient = new ApiClient()
