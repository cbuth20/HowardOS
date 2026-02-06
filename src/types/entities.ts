import { Database } from './database.types'

// Re-export from database types as single source of truth
export type User = Database['public']['Tables']['profiles']['Row']
export type Organization = Database['public']['Tables']['organizations']['Row']
export type Task = Database['public']['Tables']['tasks']['Row']
export type File = Database['public']['Tables']['files']['Row']
export type FilePermission = Database['public']['Tables']['file_permissions']['Row']
export type ActivityLog = Database['public']['Tables']['activity_log']['Row']
export type Notification = Database['public']['Tables']['notifications']['Row']

// Type aliases for specific fields
export type UserRole = User['role']
export type TaskStatus = Task['status']
export type TaskPriority = Task['priority']
export type FilePermissionType = FilePermission['permission']

// Profile type for convenience (User is same as Profile)
export type Profile = User

// Extended types with relations
export type TaskWithProfiles = Task & {
  assigned_to_profile?: Pick<User, 'id' | 'full_name' | 'email' | 'avatar_url' | 'role'> | null
  created_by_profile?: Pick<User, 'id' | 'full_name' | 'email' | 'avatar_url'> | null
}

export type FileWithUploader = File & {
  uploaded_by_profile?: Pick<User, 'id' | 'full_name' | 'email'> | null
}

export type FileWithPermissions = File & {
  permissions?: FilePermission[]
}

export type UserWithOrganization = User & {
  organizations?: Organization
}

export type ClientWithOrganization = UserWithOrganization & {
  role: 'client'
}

// Form input types (for creating/updating entities)
export type CreateTaskInput = Pick<Task, 'title' | 'description' | 'status' | 'priority'> & {
  assigned_to?: string | null
  due_date?: string | null
  target_org_id?: string
}

export type UpdateTaskInput = Partial<CreateTaskInput>

export type CreateFileInput = {
  name: string
  size: number
  mime_type: string
  folder_path?: string
  description?: string | null
}

export type InviteUserInput = {
  email: string
  full_name: string
  role: UserRole
  org_id: string
}
