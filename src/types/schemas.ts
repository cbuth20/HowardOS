import { z } from 'zod'

// Task schemas
export const TaskStatusSchema = z.enum(['pending', 'in_progress', 'completed', 'hidden', 'cancelled'])
export const TaskPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent'])

export const CreateTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().optional(),
  status: TaskStatusSchema,
  priority: TaskPrioritySchema,
  assigned_to: z.string().uuid().optional().nullable(),
  due_date: z.string().datetime().optional().nullable(),
  target_org_id: z.string().uuid().optional(),
})

export const UpdateTaskSchema = CreateTaskSchema.partial()

// File schemas
export const UploadFileSchema = z.object({
  name: z.string().min(1, 'File name is required'),
  size: z.number().max(50 * 1024 * 1024, 'File size must be less than 50MB'),
  mime_type: z.string().min(1, 'MIME type is required'),
  folder_path: z.string().default('/'),
  description: z.string().optional().nullable(),
})

export const ShareFileSchema = z.object({
  fileId: z.string().uuid('Invalid file ID'),
  userIds: z.array(z.string().uuid()).min(1, 'At least one user must be selected'),
  permission: z.enum(['view', 'edit', 'delete']).default('view'),
})

// User schemas
export const UserRoleSchema = z.enum(['admin', 'client'])

export const InviteUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  full_name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  role: UserRoleSchema,
  org_id: z.string().uuid('Invalid organization ID'),
})

export const UpdateProfileSchema = z.object({
  full_name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters').optional(),
  avatar_url: z.string().url('Invalid URL').optional().nullable(),
  metadata: z.record(z.any()).optional(),
})

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(6, 'Password must be at least 6 characters'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Password must be at least 6 characters'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

// Workstream schemas
export const WorkstreamTimingSchema = z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'annual', 'ad-hoc'])
export const WorkstreamStatusSchema = z.enum(['red', 'yellow', 'green'])

export const CreateWorkstreamTemplateSchema = z.object({
  vertical_id: z.string().uuid('Invalid vertical ID'),
  name: z.string().min(1, 'Name is required').max(200, 'Name must be less than 200 characters'),
  description: z.string().optional().nullable(),
  associated_software: z.string().optional().nullable(),
  timing: WorkstreamTimingSchema.optional().nullable(),
  display_order: z.number().int().default(0),
  default_sop: z.any().optional().nullable(),
})

export const UpdateWorkstreamTemplateSchema = CreateWorkstreamTemplateSchema.partial()

export const AssignWorkstreamSchema = z.object({
  template_id: z.string().uuid('Invalid template ID'),
  org_id: z.string().uuid('Invalid organization ID'),
  status: WorkstreamStatusSchema.default('yellow'),
  point_person_id: z.string().uuid('Invalid user ID').optional().nullable(),
  notes: z.string().optional().nullable(),
})

export const UpdateClientWorkstreamSchema = z.object({
  status: WorkstreamStatusSchema.optional(),
  point_person_id: z.string().uuid('Invalid user ID').optional().nullable(),
  custom_sop: z.any().optional().nullable(),
  notes: z.string().optional().nullable(),
  is_active: z.boolean().optional(),
})

// Export inferred types from schemas
export type CreateTaskInput = z.infer<typeof CreateTaskSchema>
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>
export type UploadFileInput = z.infer<typeof UploadFileSchema>
export type ShareFileInput = z.infer<typeof ShareFileSchema>
export type InviteUserInput = z.infer<typeof InviteUserSchema>
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>
export type CreateWorkstreamTemplateInput = z.infer<typeof CreateWorkstreamTemplateSchema>
export type UpdateWorkstreamTemplateInput = z.infer<typeof UpdateWorkstreamTemplateSchema>
export type AssignWorkstreamInput = z.infer<typeof AssignWorkstreamSchema>
export type UpdateClientWorkstreamInput = z.infer<typeof UpdateClientWorkstreamSchema>
