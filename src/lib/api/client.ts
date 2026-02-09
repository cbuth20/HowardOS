import { authFetch } from '@/lib/utils/auth-fetch'
import type {
  TaskWithProfiles,
  FileWithUploader,
  ClientWithOrganization,
  User,
  WorkstreamVertical,
  WorkstreamTemplateWithVertical,
  WorkstreamWithEntriesAndRollup,
  WorkstreamEntryWithDetails,
  VerticalStatusRollup,
  WorkstreamStatus,
} from '@/types/entities'
import type {
  CreateTaskInput,
  UpdateTaskInput,
  InviteUserInput,
  UpdateProfileInput,
  ChangePasswordInput,
  CreateWorkstreamTemplateInput,
  UpdateWorkstreamTemplateInput,
  CreateWorkstreamSchemaInput,
  UpdateWorkstreamSchemaInput,
  CreateWorkstreamEntrySchemaInput,
  UpdateWorkstreamEntrySchemaInput,
  BulkCreateEntriesSchemaInput,
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

  // Workstreams - Client Workstreams (new entry-based model)
  async getAllClientWorkstreams() {
    return this.request<{ workstreams: WorkstreamWithEntriesAndRollup[] }>(
      '/api/client-workstreams'
    )
  }

  async getClientWorkstream(id: string) {
    return this.request<{ workstream: WorkstreamWithEntriesAndRollup }>(
      `/api/client-workstreams?id=${id}`
    )
  }

  async getClientWorkstreamByOrg(orgId: string) {
    return this.request<{ workstream: WorkstreamWithEntriesAndRollup | null }>(
      `/api/client-workstreams?org_id=${orgId}`
    )
  }

  async createClientWorkstream(data: CreateWorkstreamSchemaInput) {
    return this.request<{ workstream: WorkstreamWithEntriesAndRollup }>(
      '/api/client-workstreams',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    )
  }

  async updateClientWorkstream(id: string, data: UpdateWorkstreamSchemaInput) {
    return this.request<{ workstream: WorkstreamWithEntriesAndRollup }>(
      `/api/client-workstreams?id=${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      }
    )
  }

  async deleteClientWorkstream(id: string) {
    return this.request<{ message: string }>(`/api/client-workstreams?id=${id}`, {
      method: 'DELETE',
    })
  }

  // Workstream Entries
  async getWorkstreamEntries(filters?: {
    workstream_id?: string
    vertical_id?: string
    status?: string
    point_person_id?: string
    is_active?: boolean
  }) {
    const params = new URLSearchParams()
    if (filters?.workstream_id) params.set('workstream_id', filters.workstream_id)
    if (filters?.vertical_id) params.set('vertical_id', filters.vertical_id)
    if (filters?.status) params.set('status', filters.status)
    if (filters?.point_person_id) params.set('point_person_id', filters.point_person_id)
    if (filters?.is_active !== undefined) params.set('is_active', String(filters.is_active))

    return this.request<{ entries: WorkstreamEntryWithDetails[] }>(
      `/api/workstream-entries?${params}`
    )
  }

  async getWorkstreamEntry(id: string) {
    return this.request<{ entry: WorkstreamEntryWithDetails }>(
      `/api/workstream-entries?id=${id}`
    )
  }

  async getWorkstreamRollup(workstreamId: string) {
    return this.request<{
      vertical_rollups: VerticalStatusRollup[]
      overall_status: WorkstreamStatus
    }>(`/api/workstream-entries/rollup?workstream_id=${workstreamId}`)
  }

  async createWorkstreamEntry(data: CreateWorkstreamEntrySchemaInput) {
    return this.request<{ entry: WorkstreamEntryWithDetails }>(
      '/api/workstream-entries',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    )
  }

  async bulkCreateWorkstreamEntries(data: BulkCreateEntriesSchemaInput) {
    return this.request<{ entries: WorkstreamEntryWithDetails[] }>(
      '/api/workstream-entries/bulk',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    )
  }

  async updateWorkstreamEntry(id: string, data: UpdateWorkstreamEntrySchemaInput) {
    return this.request<{ entry: WorkstreamEntryWithDetails }>(
      `/api/workstream-entries?id=${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      }
    )
  }

  async deleteWorkstreamEntry(id: string) {
    return this.request<{ message: string }>(`/api/workstream-entries?id=${id}`, {
      method: 'DELETE',
    })
  }
}

export const apiClient = new ApiClient()
