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

// File Channels types
export type FileChannel = {
  id: string
  org_id: string
  client_org_id: string
  name: string
  description: string | null
  created_by: string
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type ChannelFolder = {
  id: string
  channel_id: string
  name: string
  parent_path: string
  created_by: string
  created_at: string
}

export type FileChannelWithDetails = FileChannel & {
  client_organization?: Pick<Organization, 'id' | 'name' | 'slug' | 'logo_url'>
  created_by_profile?: Pick<User, 'id' | 'full_name' | 'email'> | null
  file_count?: number
  latest_activity?: string | null
  primary_contact?: Pick<User, 'id' | 'full_name' | 'email'> | null
}

export type ChannelFolderWithCreator = ChannelFolder & {
  created_by_profile?: Pick<User, 'id' | 'full_name' | 'email'> | null
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
  channel_id?: string
}

export type InviteUserInput = {
  email: string
  full_name: string
  role: UserRole
  org_id: string
}

// Workstreams module types
// Note: These will be properly typed after running the migration and regenerating types
export type WorkstreamVertical = any // Database['public']['Tables']['workstream_verticals']['Row']
export type WorkstreamTemplate = any // Database['public']['Tables']['workstream_templates']['Row']

// Type aliases for workstream fields
export type WorkstreamStatus = 'red' | 'yellow' | 'green'
export type WorkstreamTiming = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'ad-hoc'

// New entry-based model types
export type ClientWorkstream = {
  id: string
  org_id: string
  name: string
  notes?: string | null
  created_at: string
  created_by: string
  updated_at: string
}

export type WorkstreamEntry = {
  id: string
  workstream_id: string
  vertical_id: string
  name: string
  description?: string | null
  associated_software?: string | null
  timing?: WorkstreamTiming | null
  point_person_id?: string | null
  status: WorkstreamStatus
  notes?: string | null
  custom_sop?: any | null
  display_order: number
  is_active: boolean
  template_id?: string | null
  created_at: string
  updated_at: string
}

export type WorkstreamEntryStatusHistory = {
  id: string
  entry_id: string
  old_status?: WorkstreamStatus | null
  new_status: WorkstreamStatus
  changed_by: string
  notes?: string | null
  created_at: string
}

export type VerticalStatusRollup = {
  vertical_id: string
  rollup_status: WorkstreamStatus
  total_entries: number
  red_count: number
  yellow_count: number
  green_count: number
}

// Extended types with relations
export type WorkstreamTemplateWithVertical = WorkstreamTemplate & {
  vertical?: WorkstreamVertical
}

export type WorkstreamEntryWithDetails = WorkstreamEntry & {
  vertical?: WorkstreamVertical
  point_person?: Pick<User, 'id' | 'full_name' | 'email' | 'avatar_url'> | null
  template?: Pick<WorkstreamTemplate, 'id' | 'name'> | null
}

export type WorkstreamWithEntriesAndRollup = ClientWorkstream & {
  organization?: Pick<Organization, 'id' | 'name' | 'slug'>
  entries?: WorkstreamEntryWithDetails[]
  vertical_rollups?: VerticalStatusRollup[]
  overall_status?: WorkstreamStatus
  total_entries?: number
}

// Form input types for templates (unchanged)
export type CreateWorkstreamTemplateInput = {
  vertical_id: string
  name: string
  description?: string | null
  associated_software?: string | null
  timing?: WorkstreamTiming | null
  default_sop?: any | null
  display_order?: number
}

export type UpdateWorkstreamTemplateInput = Partial<CreateWorkstreamTemplateInput>

// Form input types for new entry-based model
export type CreateWorkstreamInput = {
  org_id: string
  name?: string
  notes?: string | null
}

export type UpdateWorkstreamInput = {
  name?: string
  notes?: string | null
}

export type CreateWorkstreamEntryInput = {
  workstream_id: string
  vertical_id: string
  name: string
  description?: string | null
  associated_software?: string | null
  timing?: WorkstreamTiming | null
  point_person_id?: string | null
  status?: WorkstreamStatus
  notes?: string | null
  custom_sop?: any | null
  template_id?: string | null
  display_order?: number
}

export type UpdateWorkstreamEntryInput = {
  name?: string
  description?: string | null
  associated_software?: string | null
  timing?: WorkstreamTiming | null
  point_person_id?: string | null
  status?: WorkstreamStatus
  notes?: string | null
  custom_sop?: any | null
  display_order?: number
  is_active?: boolean
}

export type BulkCreateEntriesInput = {
  workstream_id: string
  template_ids: string[]
}
